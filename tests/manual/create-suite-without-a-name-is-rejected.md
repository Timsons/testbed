# Create suite without a name is rejected

## Preconditions

None

## Steps

1. Send a create-suite request with feature "login" and status "draft", omitting the name field entirely.
2. Read the response.

## Expected Result

The API returns an error and does not create a suite.

## Severity

Major

## Status

Draft
