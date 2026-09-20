# Create suite with status given as a non-string type is rejected

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite", feature "login", and status set to the number 1 (not a string).
2. Read the response.

## Expected Result

The API returns an error and does not create a suite. A non-string value is not silently coerced into a valid status.

## Severity

Major

## Status

Draft
