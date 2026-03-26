#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add photo progress i18n keys to CRM"""

FILE = "/Users/bastian/Desktop/Flowmatix/CRM/src/data/i18n.js"
with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = {
    "en": {
        "photo_front": "Front",
        "photo_top": "Top",
        "photo_back": "Back",
        "photo_ready_review": "Ready for doctor review",
        "photo_waiting_remaining": "Waiting for remaining photos",
        "view_case": "View Case",
    },
    "de": {
        "photo_front": "Vorne",
        "photo_top": "Oben",
        "photo_back": "Hinten",
        "photo_ready_review": "Bereit zur ärztlichen Prüfung",
        "photo_waiting_remaining": "Warte auf restliche Fotos",
        "view_case": "Fall ansehen",
    },
    "tr": {
        "photo_front": "Ön",
        "photo_top": "Üst",
        "photo_back": "Arka",
        "photo_ready_review": "Doktor incelemesine hazır",
        "photo_waiting_remaining": "Kalan fotoğraflar bekleniyor",
        "view_case": "Vakayı Gör",
    },
    "es": {
        "photo_front": "Frente",
        "photo_top": "Superior",
        "photo_back": "Posterior",
        "photo_ready_review": "Listo para revisión médica",
        "photo_waiting_remaining": "Esperando fotos restantes",
        "view_case": "Ver Caso",
    },
    "fr": {
        "photo_front": "Face",
        "photo_top": "Dessus",
        "photo_back": "Arrière",
        "photo_ready_review": "Prêt pour examen médical",
        "photo_waiting_remaining": "En attente des photos restantes",
        "view_case": "Voir le Cas",
    },
    "it": {
        "photo_front": "Fronte",
        "photo_top": "Sopra",
        "photo_back": "Dietro",
        "photo_ready_review": "Pronto per revisione medica",
        "photo_waiting_remaining": "In attesa delle foto rimanenti",
        "view_case": "Vedi Caso",
    },
    "pt": {
        "photo_front": "Frente",
        "photo_top": "Topo",
        "photo_back": "Traseira",
        "photo_ready_review": "Pronto para revisão médica",
        "photo_waiting_remaining": "Aguardando fotos restantes",
        "view_case": "Ver Caso",
    },
}

lang_order = ["en", "de", "tr", "es", "fr", "it", "pt"]

for lang in lang_order:
    keys = new_keys[lang]
    # Build insertion string
    insert = ", ".join(f'"{k}": "{v}"' for k, v in keys.items())

    # Find the "review_now" key in this language and insert after it
    marker = f'"review_now"'

    # Find the Nth occurrence based on language
    idx = lang_order.index(lang)
    pos = -1
    search_start = 0
    for i in range(idx + 1):
        pos = content.find(marker, search_start)
        if pos == -1:
            break
        if i < idx:
            search_start = pos + 1

    if pos != -1:
        # Find the end of the "review_now": "..." value
        # Look for the closing quote + comma after the value
        val_start = content.find(':', pos) + 1
        # Skip whitespace and opening quote
        while content[val_start] in ' "':
            val_start += 1
        val_start -= 1  # back to the quote
        # Find closing quote
        val_end = content.find('"', val_start + 1)
        # Move past the comma
        insert_pos = val_end + 1
        if content[insert_pos] == ',':
            insert_pos += 1

        content = content[:insert_pos] + " " + insert + "," + content[insert_pos:]
        print(f"  Added {lang}: {len(keys)} keys")
    else:
        print(f"  WARNING: review_now not found for {lang}")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
