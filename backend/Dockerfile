FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
# Set this to a reviewed full commit SHA for immutable production builds.
ARG WATERMARKS_REF=v0.7.0
RUN git clone https://github.com/guillaumemeyer/watermarks-remover.git /opt/watermarks && cd /opt/watermarks && git checkout "$WATERMARKS_REF" && git rev-parse HEAD > /opt/ENGINE_COMMIT
RUN useradd --create-home inspector
USER inspector
WORKDIR /opt/watermarks
ENV PORT=8765
EXPOSE 8765
CMD ["sh", "-c", "exec python service/scripts/server.py --host 0.0.0.0 --port ${PORT}"]
