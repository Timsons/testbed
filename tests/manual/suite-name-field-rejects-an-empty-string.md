# Suite name field rejects an empty string

## Preconditions

None

## Steps

1. Send a create-suite request with name "" and feature "login".
2. Read the response.

## Expected Result

The API returns an error and does not create a suite.

## Severity

Major

## Status

Draft
