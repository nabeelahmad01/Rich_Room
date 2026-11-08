'use client';

import React from 'react';
import HomePage from '../page';

/** Same SPA shell as lobby — sidebar shows logged-in user; rules load from admin settings. */
export default function RulesPage() {
  return <HomePage initialTab="rules" />;
}
