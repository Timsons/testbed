# Delete a non-existent suite returns an error

## Preconditions

No suite exists with id 999999.

## Steps

1. Send a delete-suite request for suite id 999999.
2. Read the response.

## Expected Result

The API returns an error indicating the suite was not found. No other suite or data is affected.

## Severity

Minor

## Status

Draft
