"""Tests for API endpoints (content, VCE)."""
import pytest


def test_list_content_user_not_found(client, api):
    """List content with user_id that has no user returns 404."""
    r = client.get(f"{api}/content/", params={"user_id": 999})
    assert r.status_code == 404


def test_vce_share_psychology_tips(client, api):
    """VCE share-psychology-tips returns advisory tips."""
    r = client.get(f"{api}/vce/share-psychology-tips")
    assert r.status_code == 200
    data = r.json()
    assert data.get("advisory_only") is True
    assert "tips" in data
    assert isinstance(data["tips"], list)
    assert len(data["tips"]) >= 1
    tip = data["tips"][0]
    assert "id" in tip and "title" in tip and "tip" in tip


def test_vce_categories(client, api):
    """VCE categories returns list (empty if not seeded)."""
    r = client.get(f"{api}/vce/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_vce_categories_today(client, api):
    """VCE categories/today returns 200 with category or 404 when none."""
    r = client.get(f"{api}/vce/categories/today")
    assert r.status_code in (200, 404)
