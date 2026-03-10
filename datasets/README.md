# Training Datasets

This folder contains all the training data used for model development.

## Contents

### fir_documents/
Scanned FIR (First Information Report) documents used for OCR training. Contains 544 annotated images with bounding boxes for key fields like police station name, year, statutes, and complainant details.

### yolo_training/
YOLO format dataset for object detection training. Split into train/val sets with corresponding labels.

## Notes
- Images are preprocessed and standardized
- Annotations are in JSON and YOLO txt formats
- See individual folder READMEs for detailed documentation
