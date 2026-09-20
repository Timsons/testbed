# Suite name field trims leading and trailing whitespace before saving

## Preconditions

None

## Steps

1. Send a create-suite request with name "  Login Suite  " (leading and trailing spaces) and feature "login".
2. Read the response.

## Expected Result

The API returns success and the stored name is "Login Suite", with the surrounding whitespace removed.

## Severity

Minor

## Status

Draft
