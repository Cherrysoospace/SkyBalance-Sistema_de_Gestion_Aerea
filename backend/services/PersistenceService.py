import json


# Utility service for reading/writing JSON payloads.
class PersistenceService:

	def parse_json_text(self, content):
		return json.loads(content)

	def to_json_text(self, payload):
		return json.dumps(payload, ensure_ascii=False, indent=2)


persistenceService = PersistenceService()