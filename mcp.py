"""Example script demonstrating the MCP filesystem server."""

import asyncio
import os
import shutil
from typing import Any

from agents import Agent, Runner, trace
from agents.mcp import MCPServer, MCPServerStdio

import api  # noqa: F401
import app  # noqa: F401

ADDITIONAL_CONTEXT: dict[str, Any] = {
    "provider": "autogen_agentchat.agents.AssistantAgent",
    "component_type": "agent",
    "version": 1,
    "component_version": 1,
    "description": "An agent that provides assistance with ability to use tools.",
    "label": "New Agent",
    "config": {
        "name": "assistant_agent",
        "model_client": {
            "provider": "autogen_ext.models.openai.OpenAIChatCompletionClient",
            "component_type": "model",
            "version": 1,
            "component_version": 1,
            "description": "Chat completion client for OpenAI hosted models.",
            "label": "OpenAIChatCompletionClient",
            "config": {"model": "gpt-4o-mini"},
        },
        "tools": [
            {
                "provider": "autogen_core.tools.FunctionTool",
                "component_type": "tool",
                "version": 1,
                "component_version": 1,
                "description": "Create custom tools by wrapping standard Python functions.",
                "label": "FunctionTool",
                "config": {
                    "source_code": (
                        "def calculator(a: float, b: float, operator: str) -> str:\n"
                        "    try:\n"
                        "        if operator == '+':\n"
                        "            return str(a + b)\n"
                        "        elif operator == '-':\n"
                        "            return str(a - b)\n"
                        "        elif operator == '*':\n"
                        "            return str(a * b)\n"
                        "        elif operator == '/':\n"
                        "            if b == 0:\n"
                        "                return 'Error: Division by zero'\n"
                        "            return str(a / b)\n"
                        "        else:\n"
                        "            return 'Error: Invalid operator. Please use +, -, *, or /'\n"
                        "    except Exception as e:\n"
                        '        return f"Error: {str(e)}"\n'
                    ),
                    "name": "calculator",
                    "description": "A simple calculator that performs basic arithmetic operations",
                    "global_imports": [],
                    "has_cancellation_support": False,
                },
            },
            {
                "provider": "autogen_core.tools.FunctionTool",
                "component_type": "tool",
                "version": 1,
                "component_version": 1,
                "description": "Create custom tools by wrapping standard Python functions.",
                "label": "New Tool",
                "config": {
                    "source_code": "def new_function():\n    pass",
                    "name": "new_function",
                    "description": "Description of the new function",
                    "global_imports": [],
                    "has_cancellation_support": False,
                },
            },
            {
                "provider": "autogen_core.tools.FunctionTool",
                "component_type": "tool",
                "version": 1,
                "component_version": 1,
                "description": "Create custom tools by wrapping standard Python functions.",
                "label": "New Tool",
                "config": {
                    "source_code": "def new_function():\n    pass",
                    "name": "new_function",
                    "description": "Description of the new function",
                    "global_imports": [],
                    "has_cancellation_support": False,
                },
            },
        ],
        "model_context": {
            "provider": "autogen_core.model_context.UnboundedChatCompletionContext",
            "component_type": "chat_completion_context",
            "version": 1,
            "component_version": 1,
            "description": "An unbounded chat completion context that keeps a view of the all the messages.",
            "label": "UnboundedChatCompletionContext",
            "config": {},
        },
        "description": "An agent that provides assistance with ability to use tools.",
        "system_message": "You are a helpful assistant. Solve tasks carefully. When done, say TERMINATE.",
        "model_client_stream": True,
        "reflect_on_tool_use": True,
        "tool_call_summary_format": "{result}",
    },
}


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
    samples_dir = os.path.join(current_dir, "sample_files")

    async with MCPServerStdio(
        params={
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", samples_dir],
        }
    ) as server:
        with trace(workflow_name="MCP Filesystem Example"):
            await run(server)


if __name__ == "__main__":
    # Let's make sure the user has npx installed
    if not shutil.which("npx"):
        raise RuntimeError("npx is not installed. Please install it with `npm install -g npx`.")

    asyncio.run(main())
