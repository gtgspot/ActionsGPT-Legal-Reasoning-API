"""Utility for deploying and running multi-model agents.

This module defines a simple multi-model agent that can be deployed to
Google's UI Studio via the ``google-adk`` command and executed locally
with ``akd``.  Model implementations are pluggable callables that accept a
prompt and return a string response.
"""

from __future__ import annotations

import argparse
from typing import Callable, Dict


class MultiModelAgent:
    """A minimal agent capable of routing prompts to different models.

    Models are registered under a name and must be callables accepting a
    prompt string and returning a response string.
    """

    def __init__(self) -> None:
        self._models: Dict[str, Callable[[str], str]] = {}

    def register(self, name: str, fn: Callable[[str], str]) -> None:
        """Register a model callable under ``name``."""
        self._models[name] = fn

    def run(self, model: str, prompt: str) -> str:
        """Execute ``prompt`` with the chosen model.

        Raises:
            ValueError: If ``model`` is unknown.
        """
        if model not in self._models:
            raise ValueError(f"Unknown model: {model}")
        return self._models[model](prompt)


def deploy_to_google_ui_studio() -> None:
    """Placeholder for deployment logic to Google's UI Studio."""
    print("Deploying agent to Google UI Studio...")
    # Real deployment logic would go here.


def run_agent(model: str, prompt: str) -> None:
    """Run the agent using the specified model and prompt."""
    agent = MultiModelAgent()
    # Example model registration; replace with real models as needed.
    agent.register("echo", lambda p: p)
    response = agent.run(model, prompt)
    print(response)


def main(argv: list[str] | None = None) -> int:
    """Command-line interface for deploying and running the agent."""
    parser = argparse.ArgumentParser(description="Multi-model agent utilities")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_deploy = sub.add_parser("google-adk", help="Deploy to Google UI Studio")
    p_deploy.set_defaults(func=lambda args: deploy_to_google_ui_studio())

    p_run = sub.add_parser("akd", help="Run the agent")
    p_run.add_argument("model", help="Model name to use")
    p_run.add_argument("prompt", help="Prompt to process")
    p_run.set_defaults(func=lambda args: run_agent(args.model, args.prompt))

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
