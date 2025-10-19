const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const fs = require('fs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const app = express();
const port = 3000;

// ---------- CONFIGURATION ----------

// AWS Regions (keep consistent between S3 + DynamoDB)
const REGION = 'us-east-1'; // change if needed
const BUCKET_NAME = 'udara-bucket-7d81c279'; // replace with your S3 bucket name

// Initialize AWS SDK clients
AWS.config.update({ region: REGION });
const s3 = new AWS.S3();

const dbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dbClient);

// Multer setup (store temporarily before uploading to S3)
const upload = multer({ dest: 'uploads/' });

// ---------- ROUTES ----------

// Upload file → store in S3 → log in DynamoDB
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // Read file from local uploads folder
        const fileContent = fs.readFileSync(req.file.path);

        // Upload to S3
        const s3Params = {
            Bucket: BUCKET_NAME,
            Key: req.file.originalname,
            Body: fileContent
        };
        const s3Result = await s3.upload(s3Params).promise();

        // Remove the temporary local file
        fs.unlinkSync(req.file.path);

        // Log upload metadata to DynamoDB
        const dbParams = {
            TableName: 'FileUploads', // make sure this table exists
            Item: {
                FileName: req.file.originalname,
                UploadTime: new Date().toISOString(),
                S3Url: s3Result.Location,
                VersionId: s3Result.VersionId || 'N/A'
            }
        };
        await ddbDocClient.send(new PutCommand(dbParams));

        res.status(200).send(`✅ File uploaded and logged: ${s3Result.Location}`);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('❌ Upload failed. ' + err.message);
    }
});

// ---------- START SERVER ----------
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
