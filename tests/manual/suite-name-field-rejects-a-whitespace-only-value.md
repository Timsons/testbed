# Suite name field rejects a whitespace-only value

## Preconditions

None

## Steps

1. Send a create-suite request with name "   " (three spaces) and feature "login".
2. Read the response.

## Expected Result

The API returns an error and does not create a suite. A value that trims to blank is treated the same as an empty name.

## Severity

Major

## Status

Draft
