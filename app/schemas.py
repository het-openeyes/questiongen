"""Request/response models."""

from pydantic import BaseModel, ConfigDict, Field

from .heuristics import MAX_SEVERITY

Text = Field(default=None, max_length=10_000)
Short = Field(default=None, max_length=300)


class MetaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Short
    evaluator: str | None = Short
    date: str | None = Field(default=None, max_length=10, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    site: str | None = Short
    device: str | None = Short
    browser: str | None = Short
    task: str | None = Field(default=None, max_length=2_000)


class CreateIn(MetaIn):
    sample: bool = False


class ItemIn(BaseModel):
    """Partial update. Send `severity: null` to clear a rating; omit a field to leave it unchanged."""

    model_config = ConfigDict(extra="forbid")

    severity: int | None = Field(default=None, ge=0, le=MAX_SEVERITY)
    issues: str | None = Text
    recommendation: str | None = Text


class Item(BaseModel):
    heuristic: int
    severity: int | None
    issues: str
    recommendation: str


class Summary(BaseModel):
    rated: int
    total: int
    counts: list[int]
    worst: int | None


class Evaluation(BaseModel):
    id: int
    name: str
    evaluator: str
    date: str
    site: str
    device: str
    browser: str
    task: str
    created_at: str
    updated_at: str
    items: list[Item]
    summary: Summary


class EvaluationListItem(BaseModel):
    id: int
    name: str
    site: str
    evaluator: str
    date: str
    updated_at: str
    summary: Summary
