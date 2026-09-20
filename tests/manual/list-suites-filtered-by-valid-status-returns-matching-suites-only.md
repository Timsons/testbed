# List suites filtered by valid status returns matching suites only

## Preconditions

At least one suite exists with status "passed" and at least one suite exists with status "draft".

## Steps

1. Send a list-suites request with status filter "passed".
2. Read the response.

## Expected Result

The API returns success with only suites whose status is exactly "passed". No suite with a different status is included.

## Severity

Major

## Status

Draft
