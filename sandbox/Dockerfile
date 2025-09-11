FROM python:3.12-slim

WORKDIR /app
COPY . /app

# Optional: install dev tools inside sandbox if needed
# RUN pip install -r requirements.txt -r requirements-dev.txt

RUN python -m compileall -q . || true

ENTRYPOINT ["/bin/bash", "/app/sandbox/run_sandbox.sh"]

