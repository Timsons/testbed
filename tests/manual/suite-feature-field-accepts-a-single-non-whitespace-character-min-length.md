# Suite feature field accepts a single non-whitespace character (min length)

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite" and feature "x".
2. Read the response.

## Expected Result

The API returns success and creates the suite with feature "x".

## Severity

Major

## Status

Draft
