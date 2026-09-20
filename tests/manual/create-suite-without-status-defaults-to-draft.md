# Create suite without status defaults to draft

## Preconditions

None

## Steps

1. Send a create-suite request with name "Checkout Smoke" and feature "checkout", omitting the status field entirely.
2. Read the response.

## Expected Result

The API returns success and the created suite has status "draft".

## Severity

Major

## Status

Draft
