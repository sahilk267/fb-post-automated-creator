"""Tests for health and root endpoints."""
import pytest


def test_root(client, api):
    """Root returns message/version (no frontend build) or SPA index (with build)."""
    r = client.get("/")
    assert r.status_code == 200
    if "application/json" in r.headers.get("content-type", ""):
        data = r.json()
        assert "message" in data
        assert "version" in data
        assert data.get("docs") == "/docs"
    else:
        # Fallback for when frontend/dist exists
        assert "text/html" in r.headers.get("content-type", "")
        assert "index.html" in r.text or "<div id=\"root\">" in r.text or "<!DOCTYPE html>" in r.text



def test_health(client):
    """Health check returns healthy."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}
