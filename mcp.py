"""Demonstrate interacting with the MCP filesystem server via the Agents SDK.

The helper in :func:`prepare_sample_directory` exposes a curated set of
repository files—such as ``README.md`` and ``config/precedent_hierarchy.yml``—
via symbolic links. This lets the example agent read real project artifacts
without copying them, so answers can reference the latest repository state.
"""

import asyncio
import os
import shutil
from pathlib import Path

from agents import Agent, Runner, trace
from agents.mcp import MCPServer

from tools.mcp_server import mcp_server_context


def prepare_sample_directory(base_dir: str) -> str:
    """Ensure the MCP example references real repository files.

    The MCP filesystem server reads from a dedicated ``sample_files`` directory.
    To keep the example relevant, populate that directory with symbolic links to
    a few authoritative project resources. If the platform does not support
    symlinks, fall back to copying the source files.
    """

    repo_root = Path(base_dir)
    sample_dir = repo_root / "sample_files"
    sample_dir.mkdir(exist_ok=True)

    sources = {
        "README.md": repo_root / "README.md",
        "canon.json": repo_root / "data" / "canon.json",
        "precedent_hierarchy.yml": repo_root / "config" / "precedent_hierarchy.yml",
    }

    for link_name, target_path in sources.items():
        if not target_path.exists():
            raise FileNotFoundError(f"Missing required sample file: {target_path}")

        link_path = sample_dir / link_name
        if link_path.exists() or link_path.is_symlink():
            link_path.unlink()

        try:
            link_path.symlink_to(target_path)
        except (OSError, NotImplementedError, AttributeError):
            shutil.copy2(target_path, link_path)

    return str(sample_dir)


async def run(mcp_server: MCPServer):
    agent = Agent(
        name="Assistant",
        instructions="Use the tools to read the filesystem and answer questions based on those files.",
        mcp_servers=[mcp_server],
    )

    # List the files it can read
    message = "Read the files and list them."
    print(f"Running: {message}")
    result = await Runner.run(starting_agent=agent, input=message)
    print(result.final_output)

    # Ask about books
    message = "What is my #1 favorite book?"
    print(f"\n\nRunning: {message}")
    result = await Runner.run(starting_agent=agent, input=message)
    print(result.final_output)

    # Ask a question that reads then reasons.
    message = "Look at my favorite songs. Suggest one new song that I might like."
    print(f"\n\nRunning: {message}")
    result = await Runner.run(starting_agent=agent, input=message)
    print(result.final_output)


async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    samples_dir = prepare_sample_directory(current_dir)

    async with mcp_server_context(samples_dir) as server:
        with trace(workflow_name="MCP Filesystem Example"):
            await run(server)


if __name__ == "__main__":
    asyncio.run(main())
