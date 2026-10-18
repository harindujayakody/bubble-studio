; Custom pages for the Bubble Studio Windows installer (included by electron-builder).

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Bubble Studio"
  !define MUI_WELCOMEPAGE_TEXT "Create Facebook posts and reels with filters, text, stickers and music, right on your computer.$\r$\n$\r$\nMade by Harindu Jayakody.$\r$\nA product of Infiax.com.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend
