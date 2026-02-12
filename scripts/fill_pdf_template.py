
import json
import sys
import os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

def fill_pdf(template_path, output_path, data_dict):
    try:
        reader = PdfReader(template_path)
        writer = PdfWriter()

        # Copy all pages from the reader to the writer
        for page in reader.pages:
            writer.add_page(page)

        # Update the form fields
        # Note: pypdf's update_page_form_field_values is the standard way, 
        # but sometimes requires lower-level handling for complex forms.
        # We'll use the high-level API first.
        
        # We need to map the keys in data_dict to the actual field names in the PDF.
        # If the keys match exactly, we can pass data_dict directly.
        
        writer.update_page_form_field_values(
            writer.pages[0], data_dict, auto_regenerate=False
        )
        
        # Attempt to flatten the form so it's no longer editable (optional)
        # for page in writer.pages:
        #     for annotation in page.get("/Annots", []):
        #         annotation.update({
        #             NameObject("/Ff"): NameObject(1)  # Make read-only
        #         })

        with open(output_path, "wb") as output_stream:
            writer.write(output_stream)
            
        print(f"SUCCESS: PDF created at {output_path}")
        return True

    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python fill_pdf_template.py <template_path> <json_data_file> <output_path>")
        sys.exit(1)

    template = sys.argv[1]
    json_file = sys.argv[2]
    output = sys.argv[3]

    if not os.path.exists(template):
        print(f"ERROR: Template file not found: {template}")
        sys.exit(1)

    if not os.path.exists(json_file):
        print(f"ERROR: JSON data file not found: {json_file}")
        sys.exit(1)

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("ERROR: Invalid JSON format in data file.")
        sys.exit(1)

    fill_pdf(template, output, data)
