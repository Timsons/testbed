# Create suite with name given as a non-string type is rejected

## Preconditions

None

## Steps

1. Send a create-suite request with name set to the number 12345 (not a string) and feature "login".
2. Read the response.

## Expected Result

The API returns an error and does not create a suite. A non-string value is not silently coerced into an accepted name.

## Severity

Major

## Status

Draft
