# Chain Dependencies

## Temporarily Disabled Dependencies

For testing purposes, the dependencies for Thunder and Bitnames have been temporarily disabled in `CardData.json`.

To re-enable the dependencies, update the entries in `CardData.json` to include:

```json
{
  "id": "thunder",
  "dependencies": ["bitcoin", "enforcer", "bitwindow"]
}

{
  "id": "bitnames",
  "dependencies": ["bitcoin", "enforcer", "bitwindow"]
}
```

These dependencies ensure that the required chains are running before starting Thunder or Bitnames in production.
