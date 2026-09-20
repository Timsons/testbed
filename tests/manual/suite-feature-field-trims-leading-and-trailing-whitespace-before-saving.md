# Suite feature field trims leading and trailing whitespace before saving

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite" and feature "  login  " (leading and trailing spaces).
2. Read the response.

## Expected Result

The API returns success and the stored feature is "login", with the surrounding whitespace removed.

## Severity

Minor

## Status

Draft
