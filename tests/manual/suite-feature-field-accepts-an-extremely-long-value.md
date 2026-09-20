# Suite feature field accepts an extremely long value

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite" and feature set to a 10,000-character string.
2. Read the response.

## Expected Result

The API either creates the suite with the full feature value stored intact, or returns a clear validation error if a length limit exists. The server does not crash, hang, or silently truncate the value without indicating it.

## Severity

Minor

## Status

Draft
