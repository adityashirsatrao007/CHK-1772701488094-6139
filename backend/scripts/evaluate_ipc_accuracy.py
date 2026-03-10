import sys
import os
import json
import random
import time
from pathlib import Path

# Add backend dir to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.services.ipc_extractor import extract_section_numbers, extract_ipc_sections
from app.services.ocr_service import extract_text_from_image

DATASET_PATH = Path('z:/Final/CHK-1772701488094-6139/datasets/fir_documents/FIR_details.json')
IMAGES_PATH = Path('z:/Final/CHK-1772701488094-6139/datasets/fir_documents/FIR_images_v1')

def evaluate_regex_accuracy():
    print("--- Evaluating IPC Extraction (Regex) on Ground Truth Texts ---")
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    statute_items = [d for d in data if d.get('category_id') == 2]
    total = len(statute_items)
    extracted_count = 0
    total_sections_found = 0
    
    # We will randomly sample 20 for printing
    sample = random.sample(statute_items, min(20, total))
    print(f"Total Statutes annotations: {total}")
    
    for item in statute_items:
        text = item['text']
        sections, _ = extract_section_numbers(text)
        if len(sections) > 0:
            extracted_count += 1
            total_sections_found += len(sections)
    
    print(f"Successfully extracted standard IPC sections from {extracted_count}/{total} cases ({extracted_count/total*100:.2f}%)")
    print(f"Total separate sections found: {total_sections_found}")
    print("\nSample extractions:")
    for item in sample:
        text = item['text']
        sections, _ = extract_section_numbers(text)
        print(f"  Input: '{text}' -> Extracted: {sections}")

def evaluate_ocr_accuracy():
    print("\n--- Evaluating End-to-End OCR + Extraction on Sample Images ---")
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    statute_items = [d for d in data if d.get('category_id') == 2]
    
    # Sample 5 distinct images
    image_names = list(set([d['image_name'] for d in statute_items]))
    sample_images = random.sample(image_names, min(5, len(image_names)))
    
    for img_name in sample_images:
        img_path = IMAGES_PATH / img_name
        if not img_path.exists():
            continue
        
        # Ground truth
        gt_texts = [d['text'] for d in statute_items if d['image_name'] == img_name]
        gt_sections = set()
        for text in gt_texts:
            sec, _ = extract_section_numbers(text)
            gt_sections.update(sec)
        
        print(f"\nProcessing {img_name}...")
        start = time.time()
        with open(img_path, 'rb') as img_f:
            image_bytes = img_f.read()
        
        try:
            # this will try to process, extract OCR, and sections
            extracted_text, conf, method = extract_text_from_image(image_bytes)
            extracted_sections_info = extract_ipc_sections(extracted_text)
            extracted_sections = [s['section'] for s in extracted_sections_info]
            
            print(f"  OCR Time: {time.time()-start:.2f}s (Method: {method}, Conf: {conf:.2f})")
            print(f"  Ground Truth Sections: {sorted(list(gt_sections))}")
            print(f"  Extracted Sections:    {sorted(extracted_sections)}")
            
            common = set(gt_sections).intersection(set(extracted_sections))
            recall = len(common) / len(gt_sections) if len(gt_sections) > 0 else 0
            print(f"  Recall on this image: {recall*100:.1f}%")
        except Exception as e:
            print(f"  Error processing image: {e}")

if __name__ == '__main__':
    evaluate_regex_accuracy()
    evaluate_ocr_accuracy()
