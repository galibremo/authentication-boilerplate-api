# SMTP Providers API

Admin-only endpoints for managing SMTP email providers. Supports Brevo, Resend, generic SMTP (nodemailer), and AWS SES.

All routes require the `access-token` HTTP-only cookie and the caller must have an admin role.
Unsafe methods require a CSRF token from `GET /csrf` sent as `x-csrf-token`.

## Provider Types

| Type | Description | Required Config Fields |
|------|-------------|----------------------|
| `brevo` | Brevo (Sendinblue) transactional email | `apiKey`, `senderEmail`, `senderName` |
| `resend` | Resend email service | `apiKey`, `senderEmail`, `senderName` |
| `nodemailer` | Generic SMTP server | `host`, `port`, `secure`, `auth.user`, `auth.pass`, `senderEmail`, `senderName` |
| `aws-ses` | Amazon SES | `accessKeyId`, `secretAccessKey`, `region`, `senderEmail`, `senderName` |

## `GET /smtp-providers`

Lists all SMTP providers with pagination.

### Query Parameters

Optional:
- `page`: positive integer, defaults to `1`.
- `pageSize`: positive integer, defaults to `10`, maximum `500`.
- `search`: searches name and provider type.
- `providerType`: filter by type (`brevo`, `resend`, `nodemailer`, `aws-ses`).
- `isActive`: `true` or `false`.
- `sort`: one of `name`, `providerType`, `isDefault`, `isActive`, `lastTestStatus`, `createdAt`, `updatedAt`.
- `dir`: `asc` or `desc`.

### Example Request

```http
GET /smtp-providers?page=1&pageSize=10&isActive=true&sort=createdAt&dir=desc
```

### Example Success

```json
{
	"statusCode": 200,
	"message": "SMTP providers fetched successfully",
	"data": {
		"rows": [
			{
				"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				"name": "Production Brevo",
				"providerType": "brevo",
				"config": {
					"apiKey": "••••••••",
					"senderEmail": "noreply@example.com",
					"senderName": "My App"
				},
				"isDefault": true,
				"isActive": true,
				"lastTestedAt": "2026-05-25T10:00:00.000Z",
				"lastTestStatus": "success",
				"createdAt": "2026-05-20T08:00:00.000Z",
				"updatedAt": "2026-05-25T10:00:00.000Z"
			}
		],
		"total": 1,
		"page": 1,
		"pageSize": 10
	},
	"timestamp": "2026-05-25T10:00:00.000Z",
	"path": "/smtp-providers"
}
```

## `GET /smtp-providers/:id`

Fetches one SMTP provider by public ID. Sensitive config fields are masked.

### Example Request

```http
GET /smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Example Success

```json
{
	"statusCode": 200,
	"message": "SMTP provider fetched successfully",
	"data": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Production Brevo",
		"providerType": "brevo",
		"config": {
			"apiKey": "••••••••",
			"senderEmail": "noreply@example.com",
			"senderName": "My App"
		},
		"isDefault": true,
		"isActive": true,
		"lastTestedAt": "2026-05-25T10:00:00.000Z",
		"lastTestStatus": "success",
		"createdAt": "2026-05-20T08:00:00.000Z",
		"updatedAt": "2026-05-25T10:00:00.000Z"
	},
	"timestamp": "2026-05-25T10:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## `POST /smtp-providers`

Creates a new SMTP provider. The first active provider created is automatically set as default.

### Body

```json
{
	"name": "Production Brevo",
	"providerType": "brevo",
	"config": {
		"apiKey": "xkeysib-...",
		"senderEmail": "noreply@example.com",
		"senderName": "My App"
	}
}
```

### Example Success

```json
{
	"statusCode": 201,
	"message": "SMTP provider created successfully",
	"data": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Production Brevo",
		"providerType": "brevo",
		"config": {
			"apiKey": "••••••••",
			"senderEmail": "noreply@example.com",
			"senderName": "My App"
		},
		"isDefault": true,
		"isActive": true,
		"lastTestedAt": null,
		"lastTestStatus": null,
		"createdAt": "2026-05-25T10:00:00.000Z",
		"updatedAt": "2026-05-25T10:00:00.000Z"
	},
	"timestamp": "2026-05-25T10:00:00.000Z",
	"path": "/smtp-providers"
}
```

## `PATCH /smtp-providers/:id`

Updates a provider's name or config. Sensitive config fields are re-encrypted on update.

### Body

At least one field is required.

```json
{
	"name": "Updated Name",
	"config": {
		"apiKey": "new-api-key",
		"senderEmail": "new@example.com",
		"senderName": "New Name"
	}
}
```

### Example Success

```json
{
	"statusCode": 200,
	"message": "SMTP provider updated successfully",
	"data": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Updated Name",
		"providerType": "brevo",
		"config": {
			"apiKey": "••••••••",
			"senderEmail": "new@example.com",
			"senderName": "New Name"
		},
		"isDefault": true,
		"isActive": true,
		"lastTestedAt": "2026-05-25T10:00:00.000Z",
		"lastTestStatus": "success",
		"createdAt": "2026-05-20T08:00:00.000Z",
		"updatedAt": "2026-05-25T11:00:00.000Z"
	},
	"timestamp": "2026-05-25T11:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## `DELETE /smtp-providers/:id`

Deletes an SMTP provider. Cannot delete the only active provider.

### Example Success

```json
{
	"statusCode": 200,
	"message": "SMTP provider deleted successfully",
	"data": {
		"deleted": true
	},
	"timestamp": "2026-05-25T12:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## `POST /smtp-providers/:id/test`

Tests the connection for a provider. Updates `lastTestedAt` and `lastTestStatus`.

### Example Success

```json
{
	"statusCode": 200,
	"message": "Connection test successful",
	"data": {
		"success": true,
		"message": "Brevo connection successful"
	},
	"timestamp": "2026-05-25T12:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/test"
}
```

### Example Failure

```json
{
	"statusCode": 200,
	"message": "Connection test failed",
	"data": {
		"success": false,
		"message": "Brevo connection failed: Invalid API key"
	},
	"timestamp": "2026-05-25T12:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/test"
}
```

## `POST /smtp-providers/:id/set-default`

Sets a provider as the default. Unsets the previous default. The provider must be active.

### Example Success

```json
{
	"statusCode": 200,
	"message": "Default SMTP provider set successfully",
	"data": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Production Brevo",
		"providerType": "brevo",
		"config": {
			"apiKey": "••••••••",
			"senderEmail": "noreply@example.com",
			"senderName": "My App"
		},
		"isDefault": true,
		"isActive": true,
		"lastTestedAt": null,
		"lastTestStatus": null,
		"createdAt": "2026-05-20T08:00:00.000Z",
		"updatedAt": "2026-05-25T13:00:00.000Z"
	},
	"timestamp": "2026-05-25T13:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/set-default"
}
```

## `PATCH /smtp-providers/:id/toggle`

Toggles a provider's active status.

### Example Success

```json
{
	"statusCode": 200,
	"message": "SMTP provider toggled successfully",
	"data": {
		"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"name": "Production Brevo",
		"providerType": "brevo",
		"config": {
			"apiKey": "••••••••",
			"senderEmail": "noreply@example.com",
			"senderName": "My App"
		},
		"isDefault": true,
		"isActive": false,
		"lastTestedAt": null,
		"lastTestStatus": null,
		"createdAt": "2026-05-20T08:00:00.000Z",
		"updatedAt": "2026-05-25T14:00:00.000Z"
	},
	"timestamp": "2026-05-25T14:00:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/toggle"
}
```

## Errors

Validation errors use `code: "validation_failed"`. Missing or invalid auth uses `unauthorized`.
Insufficient role uses `forbidden`. Missing target providers use `smtp_provider_not_found`.
Deleting the only active provider uses `cannot_delete_last_active_provider`. Setting an inactive
provider as default uses `cannot_set_inactive_default`. All provider send failures use
`email_send_failed` with a `failures` array in `meta`.

```json
{
	"statusCode": 403,
	"code": "forbidden",
	"error": "Forbidden",
	"message": "Cannot delete the only active SMTP provider. Deactivate it first or add another provider.",
	"meta": {},
	"timestamp": "2026-05-25T10:10:00.000Z",
	"path": "/smtp-providers/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"requestId": "req_123"
}
```
