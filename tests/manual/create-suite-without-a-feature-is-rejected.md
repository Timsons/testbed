# Create suite without a feature is rejected

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite" and status "draft", omitting the feature field entirely.
2. Read the response.

## Expected Result

The API returns an error and does not create a suite.

## Severity

Major

## Status

Draft
