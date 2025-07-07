-- Add ICICI Bank PDF template configuration
INSERT INTO bank_templates (
    bank_name, 
    format, 
    identifier, 
    parser_module, 
    parser_config
) VALUES (
    'ICICI Bank',
    'PDF',
    'icici_pdf_v1',
    'icici_pdf_v1.ts',
    '{
        "type": "table_based",
        "headers": [
            "Date",
            "Description", 
            "Amount",
            "Type"
        ],
        "dateColumn": "Date",
        "dateFormat": "DD-MM-YYYY",
        "amountColumn": "Amount",
        "typeColumn": "Type",
        "descriptionColumn": "Description",
        "columnTolerance": 15,
        "rowTolerance": 5,
        "datePattern": "(\\d{2}-\\d{2}-\\d{4})",
        "amountPattern": "\\d+\\.\\d{2}",
        "skipHeaderLines": 1,
        "multiLineDescription": true
    }'::jsonb
);
