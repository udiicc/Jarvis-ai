"""Mock service boundary for future model, speech, memory and approved tools."""


class MockAssistant:
    def reply(self, message: str, language: str) -> str:
        if language == "sr":
            return "Primio sam vašu poruku. Trenutno sam u demo režimu. AI, glas, memorija i automatizacija još nisu povezani."
        return "Message received. I'm running in demo mode. AI, voice, memory, and automation are not connected yet."
