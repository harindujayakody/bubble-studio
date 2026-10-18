# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript) + Tailwind CSS v4 + shadcn/ui (base-nova style, Base UI primitives, lucide icons). Chosen by the user.

## Users

Small business owners who are not designers. They need to turn a phone photo into a presentable Facebook post quickly — a promo, a new product, an opening-hours notice — without learning a pro tool.

## Product Purpose

A browser-based Facebook post and reel creator in the spirit of Canva: load a photo or video, apply filters, crop, add text, stickers and music, and export a ready-to-upload JPG, PNG or MP4. Success is a finished, good-looking post in a couple of minutes.

## Positioning

Deliberately small and focused: one canvas, the handful of edits a shop owner actually uses, no account and no template marketplace.

## Operating Context

Used at a desk or laptop between other business tasks. The output is uploaded manually to Facebook.

## Capabilities and Constraints

- Photo posts at 1:1 (1080×1080), 3:4 (1080×1440), 16:9 (1920×1080) and 9:16 (1080×1920); video reels at 9:16 only.
- Photo: filters (classic and famous looks), adjustments, crop, reposition, text, stickers, emoji, icons, blur/pixelate areas, layers; export JPG or PNG.
- Reels: trim, per-item timing on a timeline, original sound and background music with volumes, export MP4 (WebM where MP4 recording isn't available).
- Sinhala and English fonts, with ready-made Sinhala phrases.
- Everything runs in the user's browser. Photos, videos and audio are never uploaded; there is no backend (confirmed by the user). The only network use is loading fonts from Google Fonts.
- Sticker and music libraries are read from /public/custom_icons and /public/music.
- Optional auto-save keeps the last post (design plus uploaded files) in the browser's IndexedDB, off by default; turning it off deletes it.
- Undecided: templates, keeping more than one saved post.

## Brand Commitments

Product name: **Bubble Studio** (given by the user; renamed from Bubble UX).

## Evidence on Hand

No real customer content, testimonials, or sample imagery exist. Do not fabricate them.

## Product Principles

1. The photo is the hero; the interface recedes.
2. Every control a non-designer sees should be safe to try — undoable, previewed live.
3. Fewer, better options over a wall of features.
4. Export must match exactly what the canvas shows.
