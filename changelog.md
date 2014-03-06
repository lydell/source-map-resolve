### Version 0.1.1 (2014-03-06) ###

- Improved: Make sourceRoot resolving more sensible.

  A source root such as `/scripts/subdir` is now treated as `/scripts/subdir/`
  — that is, as a directory called “subdir”, not a file called “subdir”.
  Pointing to a file as source root does not makes sense.



### Version 0.1.0 (2014-03-03) ###

- Initial release.
