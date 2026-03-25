from pydantic import BaseModel


class ComparisonSchema(BaseModel):
	avlRoot: int | None
	bstRoot: int | None
	avlHeight: int
	bstHeight: int
	avlLeaves: int
	bstLeaves: int
# DTO para comparar el AVL vs BST tras carga en modo inserción