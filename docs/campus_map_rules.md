# Lost & Found — AI Location Extraction Behavior Guide

This file is loaded at runtime and injected into every AI prompt that processes a location description from a reporter. It controls exactly how the model should behave. There is no schema, no field-mapping, no category boxes. The AI reads the reporter's words and returns a clean, readable sentence.

---

## Purpose

The AI receives a raw, free-form sentence from a reporter describing:
- Where they found or lost an item (the **discovery location**), OR
- Where they handed the item over / left it (the **handoff destination**)

It must return a single clean sentence that a reader can immediately understand, preserving every meaningful detail the reporter provided.

---

## Core Extraction Rules

### 1. Zero Assumption Policy
Do not add, infer, substitute, rename, or expand anything that was not explicitly said by the reporter.

- If the reporter says **"cricket nets"** → output must contain **"Cricket Nets"**, not "Sports Area", not "Campus", not "Outdoor Facility"
- If the reporter says **"guard at gate 2"** → output must contain **"Guard at Gate 2"**, not "Security", not "Guard", not "Gate Guard"
- If the reporter says **"EE Block"** → output must say **"EE Block"**, never "Block A"
- If the reporter says **"Block A"** → output must say **"Block A"**, never "EE" or "EE Block"
- If the reporter says **"Block B"** → output must say **"Block B"**, never "CS" or "CS Block"
- If the reporter says **"CS Block"** → output must say **"CS Block"**, never "Block B"

These are hard rules. No exceptions.

### 2. What to Keep (preserve all of this)
- Named locations: building names, block names, gate numbers, room names, area names, courts, fields, corridors, floors, bridges, gardens, lawns, parking spots
- Named people or roles with their specific identifier: "guard at gate 2", "security officer near admin block", "academic office 2nd floor"
- Qualifiers that distinguish the spot: floor numbers ("3rd floor"), directional context ("between C Block and D Block"), relative landmarks ("near the library", "outside the cafeteria")
- Any specific numbers, identifiers, or labels the reporter mentioned

### 3. What to Drop (remove only these)
Remove only hollow filler words that carry zero location information:
- First-person openers: "i found it", "i saw it", "i picked it up", "i left it", "i handed it to", "i gave it to", "i submitted it to"
- Redundant prepositions used as filler: "in the", "at the", "near the", "on the" — **but only when they precede a named location**. If "in the" is part of a place name (e.g., "in the cricket nets") retain the location noun but drop the "in the"
- Time references unless they specify a location: "yesterday", "in the morning", "around noon"
- Vague uncertainty words that add no info: "i think", "maybe", "probably", "i believe it was"

**Never drop words that help identify the specific place or person.**

### 4. Formatting
- Title-case all meaningful nouns and place names: "Cricket Nets", "Gate 2", "EE Block", "3rd Floor Corridor"
- Join multiple location identifiers with a comma: "Cricket Nets, Block C Side"
- Join a person/role with their location using "at": "Guard at Gate 2", "Security Officer at Admin Block"
- Keep the output short and readable — one line, no full sentences, no punctuation at the end
- Do not wrap in quotes. Do not add any explanation. Output only the clean label.

---

## Handling Special Cases

### Item Left in Place (not handed to anyone)
If the reporter says they left the item where they found it, did not pick it up, or left it on a surface:
- Extract the specific spot description: "Left on Bench Near Library", "Left at Discovery Spot in Cricket Nets"
- Do NOT write "In Safekeeping" or "Handed over to authorities" — those would be false

### Item Handed to a Person
Extract the person's role AND their location identifier together:
- "to the guard at gate 2" → "Guard at Gate 2"
- "gave it to the security officer near block a main entrance" → "Security Officer, Block A Main Entrance"
- "left with the person at the library desk" → "Library Desk"
- "handed to the academic office admin block 2nd floor" → "Academic Office, Admin Block 2nd Floor"

### Vague Handoffs
If the reporter gives a very vague handoff like "gave it to someone" or "left it somewhere":
- Output: "Handed to Unknown Person" or "Left at Unspecified Location"
- Do NOT invent a building or role

### Unknown / Not Provided
If the reporter's text is empty, says "n/a", "nothing", "not sure", or is entirely meaningless:
- Output: "Not specified"

---

## Typo Correction
Silently correct obvious spelling mistakes in location names before outputting:
- "nridge" → "Bridge"
- "c bolck" → "C Block"
- "d bolck" → "D Block"
- "adimn" → "Admin"
- "libary" → "Library"
- "cafetria" → "Cafeteria"

Correct only clear typos. Do not correct or normalize names that could be intentional (e.g., an unofficial nickname for a place).

---

## Output Format Reminder

Return **only** the clean label — a single short string. No JSON. No markdown. No explanation. No surrounding quotes.

Bad: `"The item was found in the cricket nets area near Block C."`
Good: `Cricket Nets, Near Block C`

Bad: `"Guard (Gate 2)"`
Good: `Guard at Gate 2`
