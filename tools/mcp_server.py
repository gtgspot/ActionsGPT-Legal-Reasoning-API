"""Custom MCP server wiring for ActionsGPT tools."""

from __future__ import annotations

import hashlib
import hmac
import inspect
import json
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, Mapping, Optional

from pydantic import BaseModel, Field, ValidationError

from agents.mcp import MCPServer

from api import config as app_config
from api.integrations.http import get_async_client
from api.integrations.zapier import ZapierClient, ZapierClientError
from codex_client import PromptClient
from create_installation_token import InstallationToken, create_installation_token

JsonDict = Dict[str, Any]


class FileListRequest(BaseModel):
    pattern: Optional[str] = Field(default=None, description="Optional glob pattern relative to sample root")


class FileListResponse(BaseModel):
    files: list[JsonDict]


class FileReadRequest(BaseModel):
    path: str = Field(..., description="Relative path within the sample directory")


class FileReadResponse(BaseModel):
    path: str
    content: str
    size: int


class CodexPromptRequest(BaseModel):
    template: str = Field(..., description="Prompt template name")
    variables: Dict[str, str] = Field(default_factory=dict, description="Template variables")
    save_to: Optional[str] = Field(default=None, description="Optional relative path to save rendered prompt")


class CodexPromptResponse(BaseModel):
    rendered: str
    saved_to: Optional[str] = None


class GitHubRepoRequest(BaseModel):
    owner: str
    repo: str


class GitHubRepoResponse(BaseModel):
    repository: JsonDict


class GitHubWorkflowDispatchRequest(BaseModel):
    owner: str
    repo: str
    workflow: str = Field(..., description="Workflow file name or ID")
    ref: str = Field(..., description="Git reference to run the workflow against")
    inputs: Dict[str, Any] = Field(default_factory=dict)
    repository_event_type: Optional[str] = Field(
        default=None,
        description="Optional repository_dispatch event type to emit after the workflow dispatch",
    )
    client_payload: Dict[str, Any] = Field(default_factory=dict)


class GitHubDispatchResponse(BaseModel):
    ok: bool
    status_code: int


class ZapierTriggerRequest(BaseModel):
    hook: str
    event: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class ZapierTriggerResponse(BaseModel):
    ok: bool
    result: JsonDict


def _ensure_relative(base: Path, rel: str) -> Path:
    candidate = (base / rel).resolve()
    if not str(candidate).startswith(str(base.resolve())):
        raise ValueError("Path escapes sample directory")
    return candidate


def _safe_read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _now_ts() -> float:
    return time.time()


def _parse_expiry(ts: Optional[str]) -> float:
    if not ts:
        return _now_ts() + (8 * 60)
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.timestamp()
    except ValueError:
        return _now_ts() + (8 * 60)


class GitHubAppClient:
    def __init__(self) -> None:
        if app_config.GITHUB_APP_ID is None:
            raise RuntimeError("GITHUB_APP_ID not configured")
        self.app_id = str(app_config.GITHUB_APP_ID)
        self.installation_id = os.getenv("GITHUB_INSTALLATION_ID")
        if not self.installation_id:
            raise RuntimeError("GITHUB_INSTALLATION_ID not configured")
        private_key = os.getenv("GITHUB_APP_PRIVATE_KEY")
        if not private_key:
            raise RuntimeError("GITHUB_APP_PRIVATE_KEY not configured")
        self.private_key = private_key
        self.webhook_secret = app_config.GITHUB_APP_WEBHOOK_SECRET
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

    async def _refresh_token(self) -> None:
        token: InstallationToken = await create_installation_token(
            self.app_id, self.private_key, self.installation_id
        )
        self._token = token.token
        self._token_expiry = _parse_expiry(token.expires_at)

    async def _get_token(self) -> str:
        now = _now_ts()
        if not self._token or now >= (self._token_expiry - 60):
            await self._refresh_token()
        assert self._token is not None
        return self._token

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Mapping[str, Any]] = None,
        json_body: Optional[JsonDict] = None,
    ) -> JsonDict:
        url = f"https://api.github.com{path}"

        async def _call(auth_token: str) -> Any:
            headers = {
                "Authorization": f"token {auth_token}",
                "Accept": "application/vnd.github+json",
            }
            async with get_async_client(headers=headers) as client:
                return await client.request(method, url, params=params, json=json_body)

        token = await self._get_token()
        response = await _call(token)
        if response.status_code == 401:
            await self._refresh_token()
            token = await self._get_token()
            response = await _call(token)
        if response.status_code >= 400:
            raise RuntimeError(f"GitHub API call failed: {response.status_code} {response.text}")
        if response.status_code == 204 or not response.content:
            return {}
        return response.json()

    async def get_repository(self, owner: str, repo: str) -> JsonDict:
        return await self._request("GET", f"/repos/{owner}/{repo}")

    async def dispatch_workflow(
        self,
        owner: str,
        repo: str,
        workflow: str,
        ref: str,
        inputs: Mapping[str, Any],
        repository_event_type: Optional[str],
        client_payload: Mapping[str, Any],
    ) -> JsonDict:
        body: JsonDict = {
            "ref": ref,
            "inputs": dict(inputs),
        }
        path = f"/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches"
        workflow_response = await self._request("POST", path, json_body=body)
        payload = dict(client_payload) if client_payload else {}
        repo_dispatch: Optional[JsonDict] = None
        if repository_event_type and payload:
            dispatch_body: JsonDict = {
                "event_type": repository_event_type,
                "client_payload": payload,
            }
            if self.webhook_secret:
                serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
                digest = hmac.new(
                    self.webhook_secret.encode("utf-8"),
                    msg=serialized,
                    digestmod=hashlib.sha256,
                ).hexdigest()
                dispatch_body["client_payload"]["mcp_signature"] = f"sha256={digest}"
            repo_dispatch = await self._request(
                "POST", f"/repos/{owner}/{repo}/dispatches", json_body=dispatch_body
            )
        return {
            "workflow_dispatch": workflow_response,
            "repository_dispatch": repo_dispatch,
            "client_payload": payload,
        }


def _register_tool(
    server: MCPServer,
    *,
    name: str,
    handler: Callable[[Mapping[str, Any]], Awaitable[JsonDict]],
    description: str,
    input_model: type[BaseModel],
    output_model: type[BaseModel],
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    register = getattr(server, "register_tool", None)
    if register is None:
        raise RuntimeError("MCPServer implementation missing register_tool")
    schema_in = input_model.model_json_schema()
    schema_out = output_model.model_json_schema()
    register(
        name=name,
        handler=handler,
        description=description,
        input_schema=schema_in,
        output_schema=schema_out,
        metadata=metadata or {},
    )


def create_server(samples_dir: str) -> MCPServer:
    base = Path(samples_dir).resolve()
    server = MCPServer(name="actions-gpt", version="1.0.0")

    prompt_client = PromptClient()
    github_client: Optional[GitHubAppClient]
    try:
        github_client = GitHubAppClient()
    except RuntimeError:
        github_client = None
    zapier_client = ZapierClient.from_env()

    async def list_files(params: Mapping[str, Any]) -> JsonDict:
        try:
            request = FileListRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        pattern = request.pattern or "**/*"
        files = []
        for path in base.glob(pattern):
            if path.is_file():
                rel = str(path.relative_to(base))
                files.append({"path": rel, "size": path.stat().st_size})
        files.sort(key=lambda item: item["path"])
        return FileListResponse(files=files).model_dump()

    async def read_file(params: Mapping[str, Any]) -> JsonDict:
        try:
            request = FileReadRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        path = _ensure_relative(base, request.path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(request.path)
        content = _safe_read_text(path)
        return FileReadResponse(path=request.path, content=content, size=path.stat().st_size).model_dump()

    async def codex_prompt(params: Mapping[str, Any]) -> JsonDict:
        try:
            request = CodexPromptRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        prompt = prompt_client.load(request.template)
        rendered = prompt_client.render(prompt, **request.variables)
        saved_to: Optional[str] = None
        if request.save_to:
            out_path = _ensure_relative(base, request.save_to)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(rendered, encoding="utf-8")
            saved_to = str(out_path.relative_to(base))
        return CodexPromptResponse(rendered=rendered, saved_to=saved_to).model_dump()

    async def github_repo(params: Mapping[str, Any]) -> JsonDict:
        if github_client is None:
            raise RuntimeError("GitHub App credentials not configured")
        try:
            request = GitHubRepoRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        repo = await github_client.get_repository(request.owner, request.repo)
        return GitHubRepoResponse(repository=repo).model_dump()

    async def github_dispatch(params: Mapping[str, Any]) -> JsonDict:
        if github_client is None:
            raise RuntimeError("GitHub App credentials not configured")
        try:
            request = GitHubWorkflowDispatchRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        if request.repository_event_type and not app_config.GITHUB_APP_WEBHOOK_SECRET:
            raise RuntimeError(
                "Webhook secret must be configured before emitting repository_dispatch events"
            )
        result = await github_client.dispatch_workflow(
            request.owner,
            request.repo,
            request.workflow,
            request.ref,
            request.inputs,
            request.repository_event_type,
            request.client_payload,
        )
        return GitHubDispatchResponse(ok=True, status_code=204).model_dump() | {"details": result}

    async def zapier_trigger(params: Mapping[str, Any]) -> JsonDict:
        try:
            request = ZapierTriggerRequest.model_validate(params or {})
        except ValidationError as exc:
            raise ValueError(str(exc))
        payload = {"event": request.event or request.hook, "data": request.data}
        try:
            result = await zapier_client.trigger(request.hook, payload)
        except ZapierClientError as exc:
            raise RuntimeError(str(exc))
        return ZapierTriggerResponse(ok=True, result=result).model_dump()

    capabilities = {
        "filesystem": {"list": True, "read": True},
        "codex": {"render": True},
        "github": {"metadata": github_client is not None, "dispatch": github_client is not None},
        "zapier": {"hooks": bool(zapier_client.describe())},
    }
    if hasattr(server, "capabilities") and isinstance(server.capabilities, dict):
        server.capabilities.update(capabilities)

    _register_tool(
        server,
        name="list_sample_files",
        handler=list_files,
        description="List files available to the agent in the sample directory",
        input_model=FileListRequest,
        output_model=FileListResponse,
        metadata={"category": "filesystem"},
    )
    _register_tool(
        server,
        name="read_sample_file",
        handler=read_file,
        description="Read a file from the sample directory",
        input_model=FileReadRequest,
        output_model=FileReadResponse,
        metadata={"category": "filesystem"},
    )
    _register_tool(
        server,
        name="render_codex_prompt",
        handler=codex_prompt,
        description="Render a Codex prompt template with variables",
        input_model=CodexPromptRequest,
        output_model=CodexPromptResponse,
        metadata={"category": "codex"},
    )
    _register_tool(
        server,
        name="github_repository_metadata",
        handler=github_repo,
        description="Fetch metadata for a GitHub repository",
        input_model=GitHubRepoRequest,
        output_model=GitHubRepoResponse,
        metadata={"category": "github"},
    )
    _register_tool(
        server,
        name="github_dispatch_workflow",
        handler=github_dispatch,
        description="Trigger a GitHub Actions workflow via the REST API",
        input_model=GitHubWorkflowDispatchRequest,
        output_model=GitHubDispatchResponse,
        metadata={"category": "github"},
    )
    _register_tool(
        server,
        name="zapier_trigger_hook",
        handler=zapier_trigger,
        description="Invoke a configured Zapier webhook",
        input_model=ZapierTriggerRequest,
        output_model=ZapierTriggerResponse,
        metadata={"category": "zapier"},
    )

    return server


@asynccontextmanager
async def mcp_server_context(samples_dir: str) -> AsyncIterator[MCPServer]:
    server = create_server(samples_dir)
    if hasattr(server, "__aenter__") and hasattr(server, "__aexit__"):
        async with server:  # type: ignore[async-with-compatible]
            yield server
        return
    try:
        yield server
    finally:
        close = getattr(server, "close", None)
        if callable(close):
            result = close()
            if inspect.isawaitable(result):
                await result


__all__ = ["create_server", "mcp_server_context"]
