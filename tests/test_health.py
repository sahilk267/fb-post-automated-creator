"""Tests for health and root endpoints."""
import pytest


def test_root(client, api):
    """Root returns message, version, docs."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "version" in data
    assert data.get("docs") == "/docs"


def test_health(client):
    """Health check returns healthy."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}
