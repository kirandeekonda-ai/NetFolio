# Real-time Connection Troubleshooting

If you're experiencing real-time connection timeouts, you have several options to resolve the issue:

## Option 1: Disable Real-time (Recommended for Development)

Add this to your `.env.local` file:

```
NEXT_PUBLIC_DISABLE_REALTIME=true
```

This will disable real-time completely and use polling mode only, which is more reliable for development environments.

## Option 2: Automatic Fallback (Default)

The system will automatically fall back to polling mode if real-time connection fails. You'll see logs like:

```
Real-time connection timeout, falling back to polling mode
```

## Option 3: Check Supabase Configuration

Ensure your Supabase real-time settings are properly configured:

1. Check if real-time is enabled in your Supabase project
2. Verify your RLS policies allow real-time subscriptions
3. Check your network/firewall settings

## How It Works

- **Real-time Mode**: Instant updates via WebSocket connections
- **Polling Mode**: Checks for updates every 30 seconds via API calls
- **Automatic Fallback**: Switches to polling if real-time fails

## Troubleshooting Steps

1. Check browser console for detailed error logs
2. Verify Supabase connection in Network tab
3. Test with `NEXT_PUBLIC_DISABLE_REALTIME=true` to confirm polling works
4. Contact support if issues persist

## Performance Impact

- Real-time: Near-instant updates, lower server load
- Polling: 30-second delay, slightly higher server load
- Both modes provide the same functionality, just different update timing
