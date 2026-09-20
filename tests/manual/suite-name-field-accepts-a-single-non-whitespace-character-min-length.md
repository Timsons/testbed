# Suite name field accepts a single non-whitespace character (min length)

## Preconditions

None

## Steps

1. Send a create-suite request with name "A" and feature "login".
2. Read the response.

## Expected Result

The API returns success and creates the suite with name "A".

## Severity

Major

## Status

Draft
