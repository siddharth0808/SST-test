console.log('app stage:', $app.stage);
const stage = $app.stage || 'qa';

export const dynamodb_table_users = new sst.aws.Dynamo(`Users-${stage}`, {
	fields: {
		id: 'string',
		accessTokenExpiresTtl: 'number',
		username: 'string',
		session_id: 'string'
	},
	primaryIndex: { hashKey: 'id' },
	globalIndexes: {
		byaccessTokenExpiresTtl: { hashKey: 'accessTokenExpiresTtl' },
		byusername: { hashKey: 'username' },
		bysession_id: { hashKey: 'session_id' }
	},
	ttl: 'accessTokenExpiresTtl', // Assuming 'access_token_expires_ttl' is the TTL field
	transform: {
		table: {
			name: `Users-${stage}` // Use environment variable for stage
		}
	}
});

export const dynamodb_table_sessions = new sst.aws.Dynamo(`Sessions-${stage}`, {
	fields: {
		id: 'string',
		user_id: 'string',
		expireAt: 'string',
		sessionExpiresTtl: 'number'
	},
	primaryIndex: { hashKey: 'id' },
	globalIndexes: {
		byuser_id: { hashKey: 'user_id' },
		byexpireAt: { hashKey: 'expireAt' },
		bysessionExpiresTtl: { hashKey: 'sessionExpiresTtl' }
	},
	ttl: 'sessionExpiresTtl',
	transform: {
		table: {
			name: `Sessions-${stage}`
		}
	}
});

// Create a managed policy for accessing only the specific tables
export const dynamoDBAccessPolicy = new aws.iam.Policy(`ssr-uce-compute-policy-${stage}`, {
	name: `ssr-uce-compute-policy-${stage}`,
	policy: $resolve([usersTable?.arn ?? '', sessionsTable?.arn ?? '']).apply(
		([usersTableArn, sessionsTableArn]) =>
			JSON.stringify({
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: [
							'dynamodb:GetItem',
							'dynamodb:PutItem',
							'dynamodb:UpdateItem',
							'dynamodb:DeleteItem',
							'dynamodb:Query',
							'dynamodb:Scan',
							'dynamodb:BatchWriteItem'
						],
						Resource: [usersTableArn, sessionsTableArn]
					}
				]
			})
	)
});

export const computeRole = new aws.iam.Role(`ssr-uce-compute-role-${stage}`, {
	name: `ssr-uce-compute-role-${stage}`,
	assumeRolePolicy: JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Action: 'sts:AssumeRole',
				Effect: 'Allow',
				Sid: '',
				Principal: {
					Service: 'amplify.amazonaws.com'
				}
			}
		]
	}),
	managedPolicyArns: [dynamoDBAccessPolicy.arn]
});
