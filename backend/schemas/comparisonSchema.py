from pydantic import BaseModel


class ComparisonSchema(BaseModel):
	"""Legacy AVL vs BST metrics comparison payload."""
	avlRoot: int | None
	bstRoot: int | None
	avlHeight: int
	bstHeight: int
	avlLeaves: int
	bstLeaves: int