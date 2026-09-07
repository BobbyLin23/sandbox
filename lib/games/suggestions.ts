import type { LucideIcon } from "lucide-react"
import { Box, Car, Cloud, Crosshair, Swords, Target, Zap } from "lucide-react"

export type Suggestion = {
  icon: LucideIcon
  label: string
  prompt: string
}

export const suggestions: Suggestion[] = [
  {
    icon: Box,
    label: "Voxel survival",
    prompt:
      "Build a voxel survival game. I gather wood and stone, craft tools, and build a shelter by hand while zombies get stronger every night. Include a day-night cycle, a simple inventory, and a health bar.",
  },
  {
    icon: Swords,
    label: "Ink samurai duel",
    prompt:
      "Build a one-on-one samurai duel in an ink-wash painting style. Parry and strike with precise timing on a rainy bridge at dusk, with brush-stroke slashes and a best-of-three rounds score.",
  },
  {
    icon: Zap,
    label: "Comic-book firefight",
    prompt:
      "Build a top-down arena shooter with a comic-book look: bold outlines, halftone shading, and onomatopoeia pop-ups like POW! and BANG! on every hit. Waves of enemies, screen shake, and combo scoring.",
  },
  {
    icon: Crosshair,
    label: "Realistic battlefield",
    prompt:
      "Build a realistic first-person battlefield shooter with recoil, cover-based enemies, and squad callouts across a war-torn city map. Include ammo management and an objective to capture three zones.",
  },
  {
    icon: Target,
    label: "Fight-first shooter",
    prompt:
      "Build a fast arcade shooter focused on pure gunplay: short rounds, snappy movement, hitscan weapons, and a score multiplier that rewards headshots and quick kills. Keep it minimal and readable.",
  },
  {
    icon: Car,
    label: "Jungle expedition drive",
    prompt:
      "Build a side-scrolling jungle off-road driving game. Balance my truck over mud, ramps, and rickety bridges, collecting fuel and gems while the engine physics keep every hill a small challenge.",
  },
  {
    icon: Cloud,
    label: "Sunny kingdom platformer",
    prompt:
      "Build a cheerful platformer set in a sunny cloud kingdom. Run, jump, and glide across floating islands, collect stars, bounce on springy clouds, and reach the castle at the end of each level.",
  },
]
