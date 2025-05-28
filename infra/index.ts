import { Resource } from "sst";

console.log("resource stage:", Resource); 
let usersTable :any//sst.aws.Dynamo.get(`Users-${process.env.STAGE}`, `Users-${process.env.STAGE}`);
let sessionsTable :any//sst.aws.Dynamo.get(`Sessions-${process.env.STAGE}`, `Sessions-${process.env.STAGE}`);
console.log("Checking for existing DynamoDB tables...");
console.log("User Table Exists:", usersTable ? usersTable.name : "No");
console.log("Session Table Exists:", sessionsTable ? sessionsTable.name : "No");
if(!usersTable){
    console.log("Creating Users table as it does not exist.");
    usersTable = new sst.aws.Dynamo(`Users-${process.env.STAGE}`, {
        // Removed invalid 'cdk' property
        fields: {
            id: "string",
            access_token_expires_ttl: "number",
        },
        primaryIndex: { hashKey: "id" },
        globalIndexes: {
            byExpireAt: { hashKey: "access_token_expires_ttl" } // Assuming a global index on 'access_token_expires_ttl'
        },
        ttl: "access_token_expires_ttl", // Assuming 'access_token_expires_ttl' is the TTL field
        transform:{
            table:{
                name:`Users-${process.env.STAGE}` // Use environment variable for stage
            }
        }
    });
}
if(!sessionsTable){
    console.log("Creating Sessions table as it does not exist.");
    sessionsTable = new sst.aws.Dynamo(`Sessions-${process.env.STAGE}`, {
        fields: {
            id: "string",
            expireAt:"number" // Assuming 'expireAt' is a number field for TTL
        },
        primaryIndex: { hashKey: "id" },
        globalIndexes: {
            byExpireAt: { hashKey: "expireAt" } // Assuming a global index on 'expireAt'
        }, // Assuming no global indexes are needed, otherwise define them here
        ttl:"expireAt", // Assuming 'expireAt' is the TTL field
        transform:{
            table:{
                name:`Sessions-${process.env.STAGE}`
            }
        }
    });
}

// Create a managed policy for accessing only the specific tables
export const dynamoDBAccessPolicy = new aws.iam.Policy(`compute-policy-${process.env.STAGE}`, {
    name: `compute-policy-${process.env.STAGE}`,
    policy: $resolve([(usersTable?.arn ?? ""), (sessionsTable?.arn ?? "")]).apply(([usersTableArn, sessionsTableArn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:BatchWriteItem"
                ],
                Resource: [
                    usersTableArn,
                    sessionsTableArn
                ]
            }
        ]
    }))
});

const existingComputeRole: any = undefined;
console.log("Existing Role:", existingComputeRole ? existingComputeRole : "No existing role found");

let createcomputeRole: aws.iam.Role | undefined = undefined;
if(!existingComputeRole) {
    console.log("Creating new compute role with DynamoDB access policy");
    createcomputeRole = new aws.iam.Role("compute-role", {
        name: "compute-role",
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Sid: "",
                Principal: {
                    Service: "amplify.amazonaws.com",
                },
            }],
        }),
        managedPolicyArns: [
            dynamoDBAccessPolicy.arn
        ],
    });
}else{
    console.log("Attaching existing role to the DynamoDB access policy");
    new aws.iam.RolePolicyAttachment(`compute-role-policy-attachment-${process.env.STAGE}`, {
        role: existingComputeRole.name,
        policyArn: dynamoDBAccessPolicy.arn,
    });
}
export const dynamodb_table_users = usersTable;
export const dynamodb_table_sessions = sessionsTable;
export const computeRole = createcomputeRole || existingComputeRole;

