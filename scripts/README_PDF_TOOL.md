# Herramienta de Llenado de Plantillas PDF

Esta herramienta permite rellenar campos de formularios PDF automáticamente usando datos de un archivo JSON.

## Requisitos
- Python 3.x
- Librería `pypdf` (Instalada: `pip install pypdf`)

## Estructura
- `scripts/fill_pdf_template.py`: El script principal.
- `templates/`: Coloca aquí tus plantillas PDF rellenables.
- `salida/`: Aquí se guardarán los PDFs generados.

## Uso

Ejecuta el siguiente comando en la terminal:

```bash
python scripts/fill_pdf_template.py "templates/TuPlantilla.pdf" "templates/sample_data.json" "salida/DocumentoRelleno.pdf"
```

## Integración con NotebookLM (Bonus)

Para usar NotebookLM para completar datos faltantes:

1.  **En Antigravity**: Sube tus documentos de gestoría a NotebookLM.
2.  **Consulta**: Cuando te falte un dato (ej. "Requisitos de Ley para el trámite X"), pregúntale a Antigravity:
    > "@notebooklm ¿Cuáles son los requisitos obligatorios para un trámite de Apertura según mis notas?"
3.  **Completa el JSON**: Usa la respuesta para llenar el archivo JSON antes de ejecutar el script.

*Nota: Una integración totalmente automatizada requeriría un script más complejo que consulte la API de MCP directamente, pero este flujo aprovecha la potencia de Antigravity como intermediario.*
