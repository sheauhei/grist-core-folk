# coding=utf-8
"""
A module for creating and sanitizing identifiers
"""
import itertools
import logging
import re
import unicodedata
from keyword import iskeyword
from string import ascii_uppercase

log = logging.getLogger(__name__)

_invalid_ident_char_re = re.compile(r'[^a-zA-Z0-9_]+')
_invalid_ident_start_re = re.compile(r'^(?=[0-9_])')

def _is_valid_ident_char(c):
  """
  Check if a character is valid for use in an identifier.
  Allows: Unicode letters (including CJK), decimal numbers, and underscore.

  This supports international characters like Chinese, Japanese, Korean, etc.
  """
  if c == '_':
    return True
  cat = unicodedata.category(c)
  # L* = All letter categories (Lu, Ll, Lt, Lo, Lm) - includes CJK characters
  # Nd = Decimal number
  return cat[0] == 'L' or cat == 'Nd'

def _is_latin_char(c):
  """
  Check if a character is in the Latin script (European languages).
  This includes: Basic Latin, Latin-1 Supplement, Latin Extended A/B/Additional.
  We use character name matching as a reliable indicator.
  """
  try:
    name = unicodedata.name(c, '')
    # Latin characters have "LATIN" in their Unicode name
    return 'LATIN' in name
  except ValueError:
    # If no name, fall back to code point ranges
    code = ord(c)
    # Basic Latin + Latin-1 + Latin Extended A/B + Latin Extended Additional
    return (0x0000 <= code <= 0x024F) or (0x1E00 <= code <= 0x1EFF)

def _sanitize_ident(ident, prefix="c", capitalize=False):
  """
  Helper for pick_ident, which given a suggested identifier, massages it to ensure it's valid for
  python (and sqlite). In particular, leaves only alphanumeric characters (including Unicode
  letters like CJK), and prepends `prefix` if it doesn't start with a letter.

  Returns empty string if there are no valid identifier characters, so consider using as
  (_sanitize_ident(...) or "your_default").

  Now supports Unicode characters including Chinese, Japanese, Korean, and other international
  alphabets (Python 3 PEP 3131).
  """
  ident = u"" if ident is None else str(ident)

  # For international character support, we need to handle different scripts carefully:
  # - European: Remove accents (é -> e, ñ -> n) using NFKD + filter
  # - CJK: Preserve characters including Japanese dakuten (ザ), Korean syllables (사)
  #
  # Strategy: Process character by character
  # - For Latin chars: decompose (NFKD), remove combining marks, keep base
  # - For other chars: keep as-is using NFC (canonical composition)
  #
  # This ensures both accent removal for Latin AND preservation of CJK integrity.

  result_chars = []
  for char in ident:
    # Check if this is a Latin character (European languages with accents)
    if _is_latin_char(char):
      # Decompose and remove combining marks for Latin characters
      decomposed = unicodedata.normalize('NFKD', char)
      # Keep only non-combining characters
      filtered = ''.join(c for c in decomposed if not unicodedata.combining(c))
      result_chars.append(filtered)
    else:
      # For non-Latin (CJK, Cyrillic, Greek, etc.), use NFC to ensure canonical form
      result_chars.append(unicodedata.normalize('NFC', char))

  ident = ''.join(result_chars)

  # Replace invalid characters with underscore, supporting Unicode letters
  ident = ''.join(c if _is_valid_ident_char(c) else '_' for c in ident)
  ident = ident.lstrip('_')
  ident = _invalid_ident_start_re.sub(prefix, ident)
  if not ident:
    return ident

  if capitalize:
    # Just capitalize the first letter (do NOT lowercase other letters like str.title() does).
    ident = ident[0].capitalize() + ident[1:]

  # Prevent names that are illegal to assign to
  while iskeyword(ident):
    ident = prefix + ident
  return ident

_ends_in_digit_re = re.compile(r'\d$')

def _add_suffix(ident_base, avoid=set(), next_suffix=1):
  """
  Helper which appends a numerical suffix to ident_base, incrementing it until the result doesn't
  conflict with anything in the `avoid` set.
  """
  if _ends_in_digit_re.search(ident_base):
    ident_base += "_"

  while True:
    ident = "%s%d" % (ident_base, next_suffix)
    if ident.upper() not in avoid:
      return ident
    next_suffix += 1

def _maybe_add_suffix(ident, avoid):
  """
  Returns the first of ident, ident2, ident3 etc. that's not in the `avoid` set.
  """
  return ident if (ident.upper() not in avoid) else _add_suffix(ident, avoid, 2)

def _uppercase(avoid):
  return {name.upper() for name in avoid}

def pick_table_ident(ident, avoid=set()):
  """
  Given a suggested identifier (which may be None), creates a sanitized table identifier,
  possibly with a numerical suffix that doesn't conflict with anything in the `avoid` set.
  """
  avoid = _uppercase(avoid)
  ident = _sanitize_ident(ident, prefix="T", capitalize=True)
  return _maybe_add_suffix(ident, avoid) if ident else _add_suffix("Table", avoid, 1)

def pick_col_ident(ident, avoid=set()):
  """
  Given a suggested identifier (which may be None), creates a sanitized column identifier,
  possibly with a numerical suffix that doesn't conflict with anything in the `avoid` set.
  """
  avoid = _uppercase(avoid)
  ident = _sanitize_ident(ident, prefix="c")
  return _maybe_add_suffix(ident, avoid) if ident else _gen_ident(avoid)


def pick_col_ident_list(ident_list, avoid=set()):
  """
  Given a list of suggested identifiers (which may be invalid), returns a list of valid sanitized
  unique identifiers, that don't conflict with anything in the `avoid` set or with each other.
  """
  avoid = _uppercase(avoid)
  result = []
  for ident in ident_list:
    ident = pick_col_ident(ident, avoid=avoid)
    avoid.add(ident.upper())
    result.append(ident)
  return result

def _gen_ident(avoid):
  """
  Helper for pick_ident, which generates a valid identifier
  when pick_ident is called without a suggested identifier or default.
  It returns the first identifier that does not conflict with any elements of the avoid set.
  The identifier is a letter or combination of letters that follows a
  similar pattern to what excel uses for naming columns.
   i.e. A, B, ... Z, AA, AB, ... AZ, BA, etc
  """
  avoid = _uppercase(avoid)
  for letter in _make_letters():
    if letter not in avoid:
      return letter

def _make_letters():
  length = 1
  while True:
    for letters in itertools.product(ascii_uppercase, repeat=length):
      yield ''.join(letters)
    length +=1
