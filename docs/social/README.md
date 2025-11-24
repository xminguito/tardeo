# Social System Documentation

This directory contains documentation for the Tardeo Social System.

## Overview

The Social System enables users to:

- **Follow** other users (Instagram-style).
- **Add Friends** (Facebook-style, two-way).
- **Chat** in real-time with text, voice (ElevenLabs), and AI (OpenAI).
- **View Profiles** with activity stats.

## Architecture

- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime, Storage).
- **Frontend**: React, TanStack Query, Shadcn UI.
- **AI/ML**: ElevenLabs (TTS), OpenAI (Chat).

## Contents

- [Database Schema](DB.md) - Tables, RLS policies, Indexes.
- [API Reference](API.md) - Edge Functions endpoints.
- [UI Components](UI.md) - Frontend components and pages.
- [Events](EVENTS.md) - Realtime events and notifications.
