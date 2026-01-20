import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario, TipoMovimento } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Studio } from '../studi/studio.entity';
import { Ticket } from '../tickets/ticket.entity';
import puppeteer from 'puppeteer';

export const LOGO_RESOLV_DEFAULT = 'iVBORw0KGgoAAAANSUhEUgAAAGUAAABjCAYAAACCJc7SAAAAxHpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjabVBbDsMgDPvPKXYE8uB1HLoyaTfY8RfAndpqlnBNXJkk1D/vFz0GhI0s5pJqSsFh1ao0FyUstMkcbPJEivD4WqekMMRLQ+NeEv4/6vwLWJ/mKp6CyhPGdjWqIb/cgvCQjo7ExY6giiCVZTACWsMoteTzCFsPV5R1aNCG1ID573fLvr09+jsq0pU1OKvaakDHiaTNDXEW9aZc89R51jM68YX829MB+gJPxFnZwOS6YAAAAYRpQ0NQSUNDIHByb2ZpbGUAAHicfZE9SMNAHMVfW6VSKiIWFFHIUJ3soiKOtQpFqBBqhVYdTC79giYNSYqLo+BacPBjserg4qyrg6sgCH6AuAtOii5S4v+SQosYD4778e7e4+4d4G9UmGp2xQFVs4x0MiFkc6tC8BVhDCKEfoxKzNTnRDEFz/F1Dx9f72I8y/vcn6NXyZsM8AnEcaYbFvEG8cympXPeJ46wkqQQnxNPGHRB4keuyy6/cS467OeZESOTnieOEAvFDpY7mJUMlXiaOKqoGuX7sy4rnLc4q5Uaa92TvzCc11aWuU5zBEksYgkiBMiooYwKLMRo1Ugxkab9hId/2PGL5JLJVQYjxwKqUCE5fvA/+N2tWZiadJPCCaD7xbY/xoDgLtCs2/b3sW03T4DAM3Cltf3VBjD7SXq9rUWPgL5t4OK6rcl7wOUOMPSkS4bkSAGa/kIBeD+jb8oBA7dAaM3trbWP0wcgQ12lboCDQ2C8SNnrHu/u6ezt3zOt/n4Ag9Vyra9a9w4AAA52aVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA0LjQuMC1FeGl2MiI+CiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpHSU1QPSJodHRwOi8vd3d3LmdpbXAub3JnL3htcC8iCiAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICB4bWxuczpwZGY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjViNmVmNWZjLWViZGItNDdjNS1iZTE4LTQ2MmZjMjdhNTBhMCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1ZWRjZDBiNi1mYzVhLTQ5ZTMtYTU3NC02Y2ZlMDUzNDlmNGYiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3NzdiNDliYi1hMTVkLTQ3MzYtOWEwNi03MTU2YjZjOTgyYWIiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09Ik1hYyBPUyIKICAgR0lNUDpUaW1lU3RhbXA9IjE3NjY0ODU2MzkyODI0NjUiCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4zNCIKICAgZGM6Rm9ybWF0PSJpbWFnZS9wbmciCiAgIHBkZjpBdXRob3I9IkFsZXNzYW5kcm8gUm9tYW5vIgogICB0aWZmOk9yaWVudGF0aW9uPSIxIgogICB4bXA6Q3JlYXRvclRvb2w9IkdJTVAgMi4xMCIKICAgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNToxMjoyM1QxMToyNzoxNyswMTowMCIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjU6MTI6MjNUMTE6Mjc6MTcrMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxYTNiOWVmMS00ZTQ1LTRiODItYmU5MS03ZjNhMGEzNGU1ZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoTWFjIE9TKSIKICAgICAgc3RFdnQ6d2hlbj0iMjAyNS0xMi0yM1QxMToyNzoxOSswMTowMCIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgIDxkYzp0aXRsZT4KICAgIDxyZGY6QWx0PgogICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+Qmx1ZSBhbmQgQmxhY2sgTW9kZXJuIEdyYWRpZW50IFNvZnR3YXJlIERldmVsb3BtZW50IFRlY2hub2xvZ3kgTG9nbyAtIDE8L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzp0aXRsZT4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pi4HdXkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfpDBcKGxPVvm1fAAAFgUlEQVR42u2dW2wUVRjH/98u2wuxrR2QcklMtiqY1gtCNFFfiMVLoj7IC6s+GxOjxkTlwfhoDE8mPGjim/FpLFATfaalaPASMcEoFgigEdqdtuz2tttt5/L5ICT4AHTOzJzdM/P9HjfZmcn89vuf75y5LCAIgiAIgiAIgiAIgiAIgiAIgiAIhkGtcBA7q9WuBdftZd/vygMdrXii/DwzOL/Y3tk5PdHdPZ9KKcWpqUECv8jEewDaaNgv+SLncPDSpq2/pkJK/8zkAHt4B4RdpsdMjvDxhb6tI0ZLuad8ZX8Aej9N+Z8jvHehb+vxWLeprUKcqdfSJgQAOOADe5jbjJPSX558mZlfT2OnxESbLjuTjxsl5b5y+QEG3k1zCxuAdhslxYP/QQamFpYxUvqnp54EaHsGpnurxkhhn/dnYw7O542QUnQcC4QnsqBkHeVPxbq95Ga9wRDH/XtcRQe71Mk+2uBjHVhfS3/TQX4Ji5c/KbxRKFVu/LgB4C8Av7m2dbJlJo/F8uTnAHbHIKLTX6RNvEy9zMi3WpXUf8pj6ftbHtYVAK+4tnWiqfFVdBwrqhD2UPBmqeg6uYGgThtbUQgANM7e9hRuAzBeKFVeaqoUQjAUSYiLDm+a7g+WyUILE1QBb2bNYTNSKFUGmyaFA346yrjhTed2sE9taHEaZ0MX78GmSLnWdSmtALOHNm+GtnOQXAMSq5RzoU/fC4VS5Q79lRIEe1W/6lfpbg6oYMTSSrjoupFHmxBfrCQlWKbuoEE9psxNFKLrOj1apUSJrmABm02aMK6h67oZs3orRTG62EVHsEpdpggJqoA3qzzFO605vhSjq9barW+M0fWda1uL2qREiq5lGCZF+bQd1tsSq0bXKjrZo/aMRNew5nmKYnTVqTdD0eVokyLRFV+VxFcpEl2xjSexSSGorXUZF10TyqfrxFqjKxYpRcexmPBIJqLrXD7xKolFSo49pSqR6EpQCjNlo+vSFF2RpWQqutRb4eGwX4gkJVPRdVU5uo5olcJM2ei6/lQ+TeNhoyuSlGvRtVO6rvgG+MhScuw/I9EVf3RFksKMbHRdmqNLWUqmouu8vq4rkpRMRZf6hPGoVikMZGStS7lKjqtGl5KUouNYDDycja4r2SuMsUkh9p+V6EouulTjKyNrXc2JrtBSIkVXHRuMkqLhCmMsUiJFlwE3bF/Hv0pRJowjWqVA9QqjYfd1rahXyVjU6Aol5b/oooey0HUtT+hd61KWQuw/pxhd642KrlnAryp//SutUiLckmpU17WiviI85tpWRZuUB+fmujMTXWea13WFklJvNHZkIbpWLxH8eTJDCgClCDItumonlZ/qG40rutYuJcdLaY+u5V9ycMt6biGKRUpH+/rfQ0fXijnR5U0TFscjPfs6rF3KHz09CwB+DFUlhqx1BTVgfiTSs6+xRle4lpjyh9IWXe4/hMqXbfBraJkqCSXlUl/feSIcSEt01U7kUR0uIKhH3tThuI8t9MjWXy4/BgQf8S3eBudXaZu/RC33tC83GI0zedRPr4MfT+Acc21rb9zHGXp0u7h5888DzM83ZqYGwXQvGFuA/79ttPZD/kN2W0CCRwjqgL9IUVd+tVWJUqXcjkKpsgvAKWSDDXEP8uEG+rUzlBEh3yQhJCkpuzIi5VBSG05CyvoMCBl1bWvUJClOyoUsAHg1yR0kIWU85VL2ubZVNk3K1wDKKRXypmtbx5LeSexSXNuqA3grZTLKAJ5ybetTHTtL5B2Srm0dAfB2SoQcBTDo2taYrh0m+qc2hVJlCMBnAEx73/3fAL4F8IVrW9onwlr+aahQqtwFYAuAO4Hmv3X7JtQAzAEor+WdXIIgCIIgCIIgCIIgCIIghOdfJT11DF01b20AAAAASUVORK5CYII=';
export const LOGO_RESOLV_FULL = 'iVBORw0KGgoAAAANSUhEUgAAAXQAAACBCAYAAADQS0FNAAAA7HpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjadVFbDgMhCPz3FD2CCD44jtvdTXqDHr+gkLp9kAgIhpnBcDwfZ7ippVYC5doKlxLFiIlTl6TFadvwEGn4YZUsg2s9NEtikhJKxHnlNCN43d9ZhC5ZXgaxocN2bXSf3z4GGRAqIwXbbVC3QZhmA8hUFQNAqf5gVLjVi7S7Q7u199kMbTCN33eqstU9K1IK6UAFPRCRJjPUU7BLBPGAVR9ansVnVKDBmGX7OlEYTdnjodBk8IbJmLJ0Y0t9QGhDNu6yw6o76t8vuk//avxTNwsvM1B2Q0hrIEEAAAGFaUNDUElDQyBwcm9maWxlAAB4nH2RvUvDUBTFT1NFkaqIGUQcIlQnu6iIY61CESqEWqFVB5OXfkGThiTFxVFwLTj4sVh1cHHW1cFVEAQ/QPwDxEnRRUq8Lym0iPXC4/04757De/cBQq3EdLsjCuiGYyXjMSmdWZW6XhHAAET0YVRhtjknywm0ra976qa6i/Cs9n1/Vq+WtRkQkIijzLQc4g3imU3H5LxPLLKCohGfE09YdEHiR66rPr9xznss8EzRSiXniUViKd/CaguzgqUTTxOHNd2gfCHts8Z5i7NeqrDGPfkLQ1ljZZnrtEYQxyKWIEOCigqKKMFBhHaDFBtJOo+18Q97fplcKrmKYORYQBk6FM8P/ge/Z2vnpib9pFAM6Hxx3Y8xoGsXqFdd9/vYdesnQPAZuDKa/nINmP0kvdrUwkdA/zZwcd3U1D3gcgcYejIVS/GkIC0hlwPez+ibMsDgLdCz5s+tcY7TByBFs0rcAAeHwHiestfbvLu7dW7/9jTm9wN3FHKoQiUBCQAADmNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgIHhtbG5zOkdJTVA9Imh0dHA6Ly93d3cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOnBkZj0iaHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6OThiN2M0ODYtMGU3OS00OGE3LTljODAtM2E2OTA4MWM0MjdhIgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmMyOTZiM2M1LThmZmItNDNlZC05ZjNhLTY0MzUyYTg0OTRlOCIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjk1ODA0ZGVkLTY5ZTctNDAzMi05MWMwLWVlYzQ1OGI0Y2ZhNSIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iTWFjIE9TIgogICBHSU1QOlRpbWVTdGFtcD0iMTc2ODY4MDk2MDM1NjE3MSIKICAgR0lNUDpWZXJzaW9uPSIyLjEwLjM0IgogICBkYzpGb3JtYXQ9ImltYWdlL3BuZyIKICAgcGRmOkF1dGhvcj0iQWxlc3NhbmRybyBSb21hbm8iCiAgIHRpZmY6T3JpZW50YXRpb249IjEiCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXA6TWV0YWRhdGFEYXRlPSIyMDI2OjAxOjE3VDIxOjE1OjU4KzAxOjAwIgogICB4bXA6TW9kaWZ5RGF0ZT0iMjAyNjowMToxN1QyMToxNTo1OCswMTowMCI+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmNjM2M3ODFlLWM5ODUtNDk0NC1hNzQxLWNlNzc4MjI5YzFmNiIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iR2ltcCAyLjEwIChNYWMgT1MpIgogICAgICBzdEV2dDp3aGVuPSIyMDI2LTAxLTE3VDIxOjE2OjAwKzAxOjAwIi8+CiAgICA8L3JkZjpTZXE+CiAgIDwveG1wTU06SGlzdG9yeT4KICAgPGRjOnRpdGxlPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5CbHVlIE1vZGVybiBUZWNobm9sb2d5IGFuZCBTb2Z0d2FyZSBDb21wYW55IExvZ28gLSAxPC9yZGY6bGk+CiAgICA8L3JkZjpBbHQ+CiAgIDwvZGM6dGl0bGU+CiAgPC9yZGY6RGVzY3JpcHRpb24+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9InciPz7rZ/RBAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAB3RJTUUH6gERFBAA/yOS8wAAG6pJREFUeNrtnXuUHVWV/7+77r2ddN+qU6TRPJHAABEGM6JhBEFGfxAQlIcMyJvgzE+iyOCD5YgOzhAYdRx/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';

interface ReportOptions {
    clienteId: string;
    dataInizio?: Date;
    dataFine?: Date;
    includiDettaglioPratiche?: boolean;
    includiMovimenti?: boolean;
    includiAnticipazioni?: boolean;
    includiCompensi?: boolean;
    includiRiepilogo?: boolean;
    includiAlert?: boolean;
    includiTickets?: boolean;
    includePraticheIds?: string[];
    includeMovimentiIds?: string[];
    includeAlertIds?: string[];
    includeTicketIds?: string[];
    note?: string;
}

interface ReportClienteData {
    cliente: Cliente;
    studio: Studio | null;
    pratiche: Pratica[];
    movimenti: MovimentoFinanziario[];
    alerts: Alert[];
    tickets: Ticket[];
    options: ReportOptions;
}

@Injectable()
export class ReportPdfServiceNew {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Pratica)
    private readonly praticaRepo: Repository<Pratica>,
    @InjectRepository(MovimentoFinanziario)
    private readonly movimentoRepo: Repository<MovimentoFinanziario>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Studio)
    private readonly studioRepo: Repository<Studio>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}
      async generaReportCliente(options: ReportOptions): Promise<Buffer> {
          const cliente = await this.clienteRepo.findOne({
              where: { id: options.clienteId },
              relations: ['studio'],
          });
          if (!cliente) {
              throw new Error('Cliente non trovato');
          }
          const studio = cliente.studio || await this.studioRepo.findOne({ where: {} });
          let pratiche = await this.praticaRepo.find({
              where: { clienteId: options.clienteId },
              relations: ['debitore', 'avvocati', 'collaboratori'],
              order: { createdAt: 'DESC' },
          });
          if (options.includePraticheIds?.length) {
              const ids = new Set(options.includePraticheIds);
              pratiche = pratiche.filter(p => ids.has(p.id));
          }
          let filteredPratiche = pratiche;
          if (options.dataInizio || options.dataFine) {
              filteredPratiche = pratiche.filter(p => {
                  const dataCreazione = new Date(p.createdAt);
                  if (options.dataInizio && dataCreazione < options.dataInizio)
                      return false;
                  if (options.dataFine && dataCreazione > options.dataFine)
                      return false;
                  return true;
              });
          }
          const praticheIds = filteredPratiche.map(p => p.id);
          let movimenti: MovimentoFinanziario[] = [];
          if ((options.includiMovimenti || options.includiAnticipazioni || options.includiCompensi) && praticheIds.length > 0) {
              movimenti = await this.movimentoRepo.find({
                  where: { praticaId: In(praticheIds) },
                  order: { data: 'DESC' },
              });
              if (options.includeMovimentiIds?.length) {
                  const ids = new Set(options.includeMovimentiIds);
                  movimenti = movimenti.filter(m => ids.has(m.id));
              }
              if (options.dataInizio || options.dataFine) {
                  movimenti = movimenti.filter(m => {
                      if (!m.data)
                          return false;
                      const dataMovimento = new Date(m.data);
                      if (options.dataInizio && dataMovimento < options.dataInizio)
                          return false;
                      if (options.dataFine && dataMovimento > options.dataFine)
                          return false;
                      return true;
                  });
              }
          }
          let alerts: Alert[] = [];
          if (options.includiAlert !== false && praticheIds.length > 0) {
              alerts = await this.alertRepo.find({
                  where: { praticaId: In(praticheIds) },
                  order: { dataScadenza: 'ASC' },
                  relations: ['pratica'],
              });
              if (options.includeAlertIds?.length) {
                  const ids = new Set(options.includeAlertIds);
                  alerts = alerts.filter(a => ids.has(a.id));
              }
              if (options.dataInizio || options.dataFine) {
                  alerts = alerts.filter(alert => {
                      if (!alert.dataScadenza)
                          return false;
                      const dataAlert = new Date(alert.dataScadenza);
                      if (options.dataInizio && dataAlert < options.dataInizio)
                          return false;
                      if (options.dataFine && dataAlert > options.dataFine)
                          return false;
                      return true;
                  });
              }
          }
          let tickets: Ticket[] = [];
          if (options.includiTickets !== false && praticheIds.length > 0) {
              tickets = await this.ticketRepo.find({
                  where: { praticaId: In(praticheIds) },
                  order: { dataCreazione: 'DESC' },
                  relations: ['pratica'],
              });
              if (options.includeTicketIds?.length) {
                  const ids = new Set(options.includeTicketIds);
                  tickets = tickets.filter(t => ids.has(t.id));
              }
              if (options.dataInizio || options.dataFine) {
                  tickets = tickets.filter(t => {
                      const d = t.dataCreazione ? new Date(t.dataCreazione) : null;
                      if (!d)
                          return false;
                      if (options.dataInizio && d < options.dataInizio)
                          return false;
                      if (options.dataFine && d > options.dataFine)
                          return false;
                      return true;
                  });
              }
          }
          return this.generaPdfProfessionale({
              cliente,
              studio,
              pratiche: filteredPratiche,
              movimenti,
              alerts,
              tickets,
              options,
          });
      }
      async generaPdfProfessionale(data: ReportClienteData): Promise<Buffer> {
          const html = this.buildHtml(data);
          return this.renderHtmlToPdf(html);
      }
      drawStatBox(doc, x, y, width, label, value, color) {
          doc.roundedRect(x, y, width, 62, 10)
              .fillAndStroke('#ffffff', '#e2e8f0');
          doc.fontSize(9).font('Helvetica').fillColor('#475569')
              .text(label, x + 12, y + 12, { width: width - 24, align: 'left' });
          doc.fontSize(18).font('Helvetica-Bold').fillColor(color)
              .text(value, x + 12, y + 28, { width: width - 24, align: 'left' });
      }
      drawAlertTable(doc, alerts, x, y, width) {
          const colWidths = {
              data: 80,
              titolo: width - 80 - 120 - 80,
              pratica: 80,
              stato: 80,
          };
          let currentY = y;
          doc.roundedRect(x, currentY, width, 26, 8)
              .fillAndStroke('#e0e7ff', '#c7d2fe');
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a');
          doc.text('Scadenza', x + 8, currentY + 8, { width: colWidths.data });
          doc.text('Titolo', x + 8 + colWidths.data, currentY + 8, { width: colWidths.titolo });
          doc.text('Pratica', x + 8 + colWidths.data + colWidths.titolo, currentY + 8, { width: colWidths.pratica });
          doc.text('Stato', x + 8 + colWidths.data + colWidths.titolo + colWidths.pratica, currentY + 8, {
              width: colWidths.stato - 12,
              align: 'right'
          });
          currentY += 25;
          const mostra = alerts.slice(0, 12);
          mostra.forEach((alert, index) => {
              const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
              doc.rect(x, currentY, width, 22)
                  .fillAndStroke(bgColor, '#e2e8f0');
              doc.fontSize(8).font('Helvetica').fillColor('#0f172a');
              const dataStr = alert.dataScadenza ? new Date(alert.dataScadenza).toLocaleDateString('it-IT') : '-';
              doc.text(dataStr, x + 8, currentY + 7, { width: colWidths.data });
              doc.text(alert.titolo || '-', x + 8 + colWidths.data, currentY + 7, {
                  width: colWidths.titolo - 8,
                  ellipsis: true
              });
              const praticaLabel = alert.pratica?.id ? `#${alert.pratica.id.slice(0, 8)}` : '-';
              doc.text(praticaLabel, x + 8 + colWidths.data + colWidths.titolo, currentY + 7, { width: colWidths.pratica });
              const statoLabel = alert.stato === 'chiuso' ? 'Chiuso' : 'In gestione';
              const statoColor = alert.stato === 'chiuso' ? '#10b981' : '#f59e0b';
              doc.fillColor(statoColor).font('Helvetica-Bold');
              doc.text(statoLabel, x + 8 + colWidths.data + colWidths.titolo + colWidths.pratica, currentY + 7, {
                  width: colWidths.stato - 12,
                  align: 'right'
              });
              doc.fillColor('#000000');
              currentY += 22;
          });
          if (alerts.length > 12) {
              currentY += 5;
              doc.fontSize(8).font('Helvetica').fillColor('#64748b')
                  .text(`... e altri ${alerts.length - 12} alert`, x, currentY, { align: 'center', width });
              currentY += 20;
          }
          return currentY + 10;
      }
      drawMovimentiTable(doc, movimenti, x, y, width) {
          const colWidths = {
              data: 70,
              tipo: 120,
              descrizione: width - 70 - 120 - 80,
              importo: 80,
          };
          let currentY = y;
          doc.roundedRect(x, currentY, width, 26, 8)
              .fillAndStroke('#e0f2fe', '#bfdbfe');
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#1d4ed8');
          doc.text('Data', x + 8, currentY + 8, { width: colWidths.data });
          doc.text('Tipo', x + 8 + colWidths.data, currentY + 8, { width: colWidths.tipo });
          doc.text('Descrizione', x + 8 + colWidths.data + colWidths.tipo, currentY + 8, { width: colWidths.descrizione });
          doc.text('Importo', x + 8 + colWidths.data + colWidths.tipo + colWidths.descrizione, currentY + 8, {
              width: colWidths.importo - 12,
              align: 'right'
          });
          currentY += 25;
          const mostra = movimenti.slice(0, 15);
          let totale = 0;
          mostra.forEach((movimento, index) => {
              const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
              doc.rect(x, currentY, width, 22)
                  .fillAndStroke(bgColor, '#e2e8f0');
              doc.fontSize(8).font('Helvetica').fillColor('#0f172a');
              const dataStr = movimento.data ? new Date(movimento.data).toLocaleDateString('it-IT') : '-';
              doc.text(dataStr, x + 8, currentY + 7, { width: colWidths.data });
              doc.text(this.getTipoMovimentoLabel(movimento.tipo), x + 8 + colWidths.data, currentY + 7, { width: colWidths.tipo });
              doc.text(movimento.oggetto || '-', x + 8 + colWidths.data + colWidths.tipo, currentY + 7, {
                  width: colWidths.descrizione - 8,
                  ellipsis: true
              });
              const importo = Number(movimento.importo);
              totale += importo;
              doc.font('Helvetica-Bold');
              doc.text(this.formatCurrency(importo), x + 8 + colWidths.data + colWidths.tipo + colWidths.descrizione, currentY + 7, {
                  width: colWidths.importo - 12,
                  align: 'right'
              });
              currentY += 22;
          });
          doc.roundedRect(x, currentY, width, 26, 8)
              .fillAndStroke('#e2e8f0', '#cbd5e1');
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a')
              .text('Totale movimenti', x + 8, currentY + 8, { width: width - colWidths.importo });
          doc.fillColor('#1d4ed8')
              .text(this.formatCurrency(totale), x + width - colWidths.importo, currentY + 8, {
              width: colWidths.importo - 12,
              align: 'right'
          });
          currentY += 26;
          if (movimenti.length > 15) {
              currentY += 5;
              doc.fontSize(8).font('Helvetica').fillColor('#64748b')
                  .text(`... e altri ${movimenti.length - 15} movimenti`, x, currentY, { align: 'center', width });
              currentY += 20;
          }
          return currentY + 20;
      }
      formatCurrency(value) {
          return new Intl.NumberFormat('it-IT', {
              style: 'currency',
              currency: 'EUR',
          }).format(value);
      }
      normalizeImporto(value) {
          if (typeof value === 'number')
              return value;
          if (typeof value === 'string') {
              const cleaned = value.replace(/[^\d,.\-]/g, '');
              const useComma = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.');
              const normalized = useComma
                  ? cleaned.replace(/\./g, '').replace(',', '.')
                  : cleaned;
              const num = Number(normalized);
              return Number.isFinite(num) ? num : 0;
          }
          return 0;
      }
      getFaseNome(faseCodice) {
          const faseMap = {
              'fase-001': 'Analisi preliminare',
              'fase-002': 'Sollecito bonario',
              'fase-003': 'Messa in mora',
              'fase-004': 'Decreto ingiuntivo',
              'fase-005': 'Notifica decreto',
              'fase-006': 'Opposizione',
              'fase-007': 'Pignoramento',
              'tentativo_bonario': 'Tentativo Bonario',
              'diffida': 'Diffida',
              'decreto_ingiuntivo': 'Decreto Ingiuntivo',
              'opposizione': 'Opposizione',
              'esecuzione': 'Esecuzione',
              'fallimento': 'Fallimento',
              'chiusa': 'Chiusa',
              'non_definita': 'Non Definita',
          };
          return faseMap[faseCodice] || faseCodice;
      }
      formatDate(value) {
          return value ? value.toLocaleDateString('it-IT') : '-';
      }
      buildHtml(data: ReportClienteData): string {
          const totalePratiche = data.pratiche.length;
          const capitaleTotale = data.pratiche.reduce((sum, p) => sum + this.normalizeImporto(p.capitale), 0);
          const totaleRecuperato = data.movimenti
              .filter(m => (m.tipo || '').toString().startsWith('recupero'))
              .reduce((sum, m) => sum + this.normalizeImporto(m.importo), 0);
          const finanzaByPratica = data.pratiche.reduce((acc, pratica) => {
              acc[pratica.id] = {
                  anticipazioni: this.normalizeImporto(pratica.anticipazioni),
                  anticipazioniRecuperate: this.normalizeImporto(pratica.importoRecuperatoAnticipazioni),
                  compensi: this.normalizeImporto(pratica.compensiLegali),
                  compensiRecuperati: this.normalizeImporto(pratica.compensiLiquidati),
              };
              return acc;
          }, {});
          data.movimenti.forEach((movimento) => {
              if (!movimento.praticaId)
                  return;
              const entry = finanzaByPratica[movimento.praticaId] || {
                  anticipazioni: 0,
                  anticipazioniRecuperate: 0,
                  compensi: 0,
                  compensiRecuperati: 0,
              };
              const tipo = String(movimento.tipo || '').toLowerCase();
              const importo = this.normalizeImporto(movimento.importo);
              if (tipo === 'anticipazione' || tipo === 'anticipazioni') {
                  entry.anticipazioni += importo;
              }
              if (tipo === 'recupero_anticipazione') {
                  entry.anticipazioniRecuperate += importo;
              }
              if (tipo === 'compenso' || tipo === 'compensi') {
                  entry.compensi += importo;
              }
              if (tipo === 'recupero_compenso' || tipo === 'recupero_compensi') {
                  entry.compensiRecuperati += importo;
              }
              finanzaByPratica[movimento.praticaId] = entry;
          });
          const anticipazioniRows = data.pratiche.map((pratica) => {
              const finanza = finanzaByPratica[pratica.id] || {
                  anticipazioni: 0,
                  anticipazioniRecuperate: 0,
                  compensi: 0,
                  compensiRecuperati: 0,
              };
              const debitore = pratica.debitore?.ragioneSociale
                  || (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');
              const daRecuperare = Math.max(finanza.anticipazioni - finanza.anticipazioniRecuperate, 0);
              return {
                  id: pratica.id,
                  numero: pratica.numeroPratica || `#${pratica.id.slice(0, 8)}`,
                  debitore: debitore || 'N/D',
                  affidate: finanza.anticipazioni,
                  recuperate: finanza.anticipazioniRecuperate,
                  daRecuperare,
              };
          });
          const compensiRows = data.pratiche.map((pratica) => {
              const finanza = finanzaByPratica[pratica.id] || {
                  anticipazioni: 0,
                  anticipazioniRecuperate: 0,
                  compensi: 0,
                  compensiRecuperati: 0,
              };
              const debitore = pratica.debitore?.ragioneSociale
                  || (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');
              const liquidabili = Math.max(finanza.compensi - finanza.compensiRecuperati, 0);
              return {
                  id: pratica.id,
                  numero: pratica.numeroPratica || `#${pratica.id.slice(0, 8)}`,
                  debitore: debitore || 'N/D',
                  maturati: finanza.compensi,
                  recuperati: finanza.compensiRecuperati,
                  liquidabili,
              };
          });
          const totaleAnticipazioni = anticipazioniRows.reduce((sum, row) => sum + row.affidate, 0);
          const totaleCompensi = compensiRows.reduce((sum, row) => sum + row.maturati, 0);
          const praticheAperte = data.pratiche.filter(p => p.aperta);
          const praticheChiuse = data.pratiche.filter(p => !p.aperta);
          const capitaleAperte = praticheAperte.reduce((s, p) => s + (p.capitale || 0), 0);
          const capitaleChiuse = praticheChiuse.reduce((s, p) => s + (p.capitale || 0), 0);
          const fasiAperte = praticheAperte.reduce<Record<string, number>>((acc, p) => {
              const fase = this.getFaseNome(p.faseId || 'N/D');
              acc[fase] = (acc[fase] || 0) + 1;
              return acc;
          }, {});
          const esitiChiuse = praticheChiuse.reduce<Record<string, number>>((acc, p) => {
              const esito = p.esito || 'N/D';
              acc[esito] = (acc[esito] || 0) + 1;
              return acc;
          }, {});
          const makePieData = (entries: Record<string, number>, palette: string[]) => {
              const pairs = Object.entries(entries).filter(([, v]) => v > 0) as [string, number][];
              const total = pairs.reduce((s, [, v]) => s + v, 0);
              let acc = 0;
              const slices = pairs.map(([label, value], idx) => {
                  const start = acc;
                  const percent = total > 0 ? (value / total) * 100 : 0;
                  acc += percent;
                  return { label, value, percent, start, end: acc, color: palette[idx % palette.length] };
              });
              return { slices, total };
          };
          const palette = ['#1f3c88', '#2fb8ad', '#d6a14d', '#7a6ff0', '#45a0e6', '#d66f6f', '#4fb573', '#8697a8'];
          const pieAperteChiuse = makePieData({ Aperte: praticheAperte.length, Chiuse: praticheChiuse.length }, palette);
          const pieFasiAperte = makePieData(fasiAperte, palette);
          const pieEsitiChiusi = makePieData(esitiChiuse, palette);
          const pieStyle = (pie) => {
              if (pie.total === 0 || pie.slices.length === 0) {
                  return 'conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)';
              }
              const parts = pie.slices.map(s => `${s.color} ${s.start}% ${s.end}%`);
              return `conic-gradient(${parts.join(', ')})`;
          };
          const datePratiche = data.pratiche
              .map(p => p.createdAt ? new Date(p.createdAt).getTime() : 0)
              .filter(d => d > 0);
          const dataPrimaPratica = datePratiche.length > 0
              ? new Date(Math.min(...datePratiche))
              : new Date();
          const logoData = data.studio?.logo
              ? (data.studio.logo.includes(',') ? data.studio.logo : `data:image/png;base64,${data.studio.logo}`)
              : `data:image/png;base64,${LOGO_RESOLV_DEFAULT}`;
          const periodoLabel = `${this.formatDate(dataPrimaPratica)} - ${this.formatDate(new Date())}`;
          const alertPages: Alert[][] = [];
          for (let i = 0; i < data.alerts.length; i += 20) {
              alertPages.push(data.alerts.slice(i, i + 20));
          }
          const pratichePages: Pratica[][] = [];
          for (let i = 0; i < data.pratiche.length; i += 10) {
              pratichePages.push(data.pratiche.slice(i, i + 10));
          }
          return `
  <!doctype html>
  <html lang="it">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; }
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        background: #f6f8fb;
        color: #1c2738;
        font-size: 11pt;
        padding-bottom: 120px; /* spazio per il footer fisso */
      }
      .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .page-break { page-break-after: always; }

      .hero {
        padding: 20px;
        background: linear-gradient(135deg, #0b1224 0%, #11283f 40%, #1d3f63 100%);
        color: #fff;
        margin-bottom: 30px;
        box-shadow: 0 20px 45px rgba(12, 25, 46, 0.25);
      }
      .hero-top { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
      .brand { display:flex; align-items:center; gap:12px; }
      .brand img { height: 64px; width: auto; }
      .title { font-size: 22px; font-weight: 700; }
      .subtitle { font-size: 12px; opacity: 0.9; margin-top:2px; }
      .badge { background: rgba(255,255,255,0.2); color:#e0f2fe; padding:8px 14px; border-radius: 8px; font-size:12px; font-weight:600; }
      .kpi-row { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-top:16px; }
      .kpi {
        padding:14px;
        border-radius:10px;
        background: rgba(255,255,255,0.14);
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
      }
      .kpi .label { font-size:11px; color:#e2e8f0; margin-bottom:4px; }
      .kpi .value { font-size:18px; font-weight:700; color:#ffffff; }

      .section { padding: 24px 20px; }
      .section h2 {
        font-size:18px;
        font-weight:700;
        color:#1c2a44;
        margin-bottom:20px;
        padding-bottom:8px;
        border-bottom: 2px solid #1f3c88;
      }

      .card {
        background:#f7f9fc;
        border:1px solid #dfe5ef;
        border-radius:10px;
        padding:16px;
        margin-bottom:14px;
        box-shadow: 0 10px 25px rgba(12, 25, 46, 0.05);
      }
      .info-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; }
      .label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
      .value { font-size:13px; font-weight:700; color:#1c2738; margin-top:4px; }

      .stats { display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:20px; }
      .stat { background:#fff; border:1px solid #dfe5ef; border-radius:10px; padding:14px; box-shadow: 0 8px 18px rgba(12,25,46,0.06); }

      table { width:100%; border-collapse: collapse; margin-top:12px; }
      th, td { padding:12px; font-size:11px; text-align:left; border-bottom:1px solid #dfe5ef; }
      th { background:#eef2f6; color:#1c2a44; font-weight:700; }
      tbody tr:hover { background:#f5f7fb; }
      tfoot td { font-weight:700; background:#e8edf5; }
      .text-right { text-align:right; }
      .badge-success { color:#0f5132; background:#d9f2e7; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-block; }
      .badge-warn { color:#8a5a07; background:#fff1d7; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-block; }

      .pratica {
        background:#fff;
        border:1px solid #dfe5ef;
        border-radius:10px;
        padding:16px;
        margin-bottom:12px;
        box-shadow: 0 10px 20px rgba(12,25,46,0.05);
      }
      .pratica-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .pratica-head .title { font-size:14px; color:#0f172a; font-weight:700; }
      .status { padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; }
      .status.open { background:#d1fae5; color:#065f46; }
      .status.close { background:#e2e8f0; color:#475569; }
      .pratica-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-top:12px; }

      .notes { background:#fdf6e3; border:1px solid #e9d8a6; border-radius:10px; padding:14px; font-size:12px; color:#7c5e10; }

      .page-title {
        font-size: 20px;
        font-weight: 700;
        color: #1c2a44;
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 3px solid #1f3c88;
      }

      .footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 16px 24px;
        background: linear-gradient(135deg, #0c162b 0%, #132844 50%, #1f3c63 100%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 0;
        box-shadow: none;
      }
      .footer-logo {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .footer-logo img {
        height: 48px;
        width: auto;
      }
      .footer-text {
        font-size: 10px;
        color: #e7ecf5;
        line-height: 1.6;
      }
      .footer-text .copyright {
        font-size: 9px;
        color: #c7d1df;
        margin-top: 6px;
      }

      .pie-triangle { display:grid; grid-template-areas:
        "top top"
        "left right";
        gap:18px;
        grid-template-columns: repeat(2, 1fr);
      }
      .pie-card { border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#f8fafc; }
      .pie-title { font-size:13px; font-weight:700; color:#0f172a; margin-bottom:8px; }
      .pie-wrapper { display:flex; align-items:center; gap:14px; }
      .pie { width:120px; height:120px; border-radius:50%; box-shadow:inset 0 0 0 12px rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#0f172a; }
      .legend { display:flex; flex-direction:column; gap:6px; font-size:11px; color:#334155; }
      .legend-row { display:flex; align-items:center; gap:8px; }
      .dot { width:10px; height:10px; border-radius:50%; }
      .pie-top { grid-area: top; }
      .pie-left { grid-area: left; }
      .pie-right { grid-area: right; }
      .bar-card { border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#f8fafc; }
      .bar-row { margin-bottom:10px; }
      .bar-label { font-size:11px; color:#334155; margin-bottom:4px; }
      .bar-track { width:100%; height:14px; background:#e2e8f0; border-radius:8px; overflow:hidden; }
      .bar-fill { height:100%; border-radius:8px; }
      .bar-legend { display:flex; gap:10px; font-size:11px; color:#334155; margin-top:8px; flex-wrap:wrap; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="content">
    <!-- PAGINA COPERTINA -->
    <div class="hero">
      <div class="hero-top">
        <div class="brand">
          <img src="${logoData}" alt="Logo" />
          <div>
            <div class="title">Report Cliente</div>
            <div class="subtitle">${data.cliente.ragioneSociale}</div>
            <div class="subtitle">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
          </div>
        </div>
        <div class="badge">${periodoLabel}</div>
      </div>
      <div class="kpi-row">
        <div class="kpi"><div class="label">Totale Pratiche</div><div class="value">${totalePratiche}</div></div>
        <div class="kpi"><div class="label">Capitale affidato</div><div class="value">${this.formatCurrency(capitaleTotale)}</div></div>
        <div class="kpi"><div class="label">Recuperato</div><div class="value">${this.formatCurrency(totaleRecuperato)}</div></div>
      </div>
    </div>

    <div class="section">
      <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:18px;">
        <div>
          <h2>Informazioni Cliente</h2>
          <div class="card">
            <div class="info-grid">
              <div><div class="label">Ragione sociale</div><div class="value">${data.cliente.ragioneSociale || 'N/D'}</div></div>
              <div><div class="label">Email</div><div class="value">${data.cliente.email || '-'}</div></div>
              <div><div class="label">P.IVA</div><div class="value">${data.cliente.partitaIva || '-'}</div></div>
              <div><div class="label">Codice Fiscale</div><div class="value">${data.cliente.codiceFiscale || '-'}</div></div>
            </div>
          </div>
        </div>
        <div>
          <h2>Informazioni Studio</h2>
          <div class="card">
            <div class="info-grid">
              <div><div class="label">Studio</div><div class="value">${data.studio?.nome || 'N/D'}</div></div>
              <div><div class="label">Email</div><div class="value">${data.studio?.email || '-'}</div></div>
              <div><div class="label">Telefono</div><div class="value">${data.studio?.telefono || '-'}</div></div>
              <div><div class="label">Indirizzo</div><div class="value">${data.studio?.indirizzo || '-'}</div></div>
            </div>
          </div>
        </div>
      </div>

      ${data.options.includiRiepilogo !== false ? `
      <h2 style="margin-top:24px;">Riepilogo grafico</h2>
      <div class="pie-triangle">
        <div class="pie-card pie-top">
          <div class="pie-title">Pratiche totali / aperte / chiuse</div>
          <div class="bar-card">
            ${(() => {
              const max = Math.max(totalePratiche, praticheAperte.length, praticheChiuse.length, 1);
              const rows = [
                  { label: 'Totali', value: totalePratiche, color: '#1f3c88' },
                  { label: 'Aperte', value: praticheAperte.length, color: '#2fb8ad' },
                  { label: 'Chiuse', value: praticheChiuse.length, color: '#d6a14d' },
              ];
              return rows.map(r => `
                <div class="bar-row">
                  <div class="bar-label">${r.label}: ${r.value}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${(r.value / max) * 100}%; background:${r.color};"></div>
                  </div>
                </div>
              `).join('');
          })()}
            <div class="bar-legend">
              <span style="color:#1f3c88;">■ Totali</span>
              <span style="color:#2fb8ad;">■ Aperte</span>
              <span style="color:#d6a14d;">■ Chiuse</span>
            </div>
          </div>
        </div>
        <div class="pie-card pie-left">
          <div class="pie-title">Pratiche aperte per fase</div>
          <div class="pie-wrapper">
            <div class="pie" style="background:${pieStyle(pieFasiAperte)}">${pieFasiAperte.total ? '' : 'N/D'}</div>
            <div class="legend">
              ${pieFasiAperte.slices.map(s => `
                <div class="legend-row">
                  <span class="dot" style="background:${s.color}"></span>
                  <span>${s.label} (${s.percent.toFixed(1)}%)</span>
                </div>
              `).join('') || '<div class="legend-row">Nessuna pratica aperta</div>'}
            </div>
          </div>
        </div>
        <div class="pie-card pie-right">
          <div class="pie-title">Pratiche chiuse per esito</div>
          <div class="pie-wrapper">
            <div class="pie" style="background:${pieStyle(pieEsitiChiusi)}">${pieEsitiChiusi.total ? '' : 'N/D'}</div>
            <div class="legend">
              ${pieEsitiChiusi.slices.map(s => `
                <div class="legend-row">
                  <span class="dot" style="background:${s.color}"></span>
                  <span>${s.label} (${s.percent.toFixed(1)}%)</span>
                </div>
              `).join('') || '<div class="legend-row">Nessuna pratica chiusa</div>'}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      ${data.options.note ? `
      <h2 style="margin-top:24px;">Note</h2>
      <div class="notes">${data.options.note}</div>
      ` : ''}
    </div>

    ${data.options.includiAnticipazioni ? `
    <div class="page-break"></div>
    <div class="section">
      <div class="page-title">Anticipazioni</div>
      <table>
        <thead>
          <tr>
            <th>Numero Pratica</th>
            <th>Debitore</th>
            <th class="text-right">Affidate</th>
            <th class="text-right">Recuperate</th>
            <th class="text-right">Da recuperare</th>
          </tr>
        </thead>
        <tbody>
          ${anticipazioniRows.map(row => `
          <tr>
            <td>${row.numero}</td>
            <td>${row.debitore}</td>
            <td class="text-right">${this.formatCurrency(row.affidate)}</td>
            <td class="text-right">${this.formatCurrency(row.recuperate)}</td>
            <td class="text-right">${this.formatCurrency(row.daRecuperare)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="text-right">Totale</td>
            <td class="text-right">${this.formatCurrency(totaleAnticipazioni)}</td>
            <td class="text-right">${this.formatCurrency(anticipazioniRows.reduce((sum, row) => sum + row.recuperate, 0))}</td>
            <td class="text-right">${this.formatCurrency(anticipazioniRows.reduce((sum, row) => sum + row.daRecuperare, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ''}

    ${data.options.includiCompensi ? `
    <div class="page-break"></div>
    <div class="section">
      <div class="page-title">Compensi</div>
      <table>
        <thead>
          <tr>
            <th>Numero Pratica</th>
            <th>Debitore</th>
            <th class="text-right">Maturati</th>
            <th class="text-right">Recuperati</th>
            <th class="text-right">Liquidabili</th>
          </tr>
        </thead>
        <tbody>
          ${compensiRows.map(row => `
          <tr>
            <td>${row.numero}</td>
            <td>${row.debitore}</td>
            <td class="text-right">${this.formatCurrency(row.maturati)}</td>
            <td class="text-right">${this.formatCurrency(row.recuperati)}</td>
            <td class="text-right">${this.formatCurrency(row.liquidabili)}</td>
          </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="text-right">Totale</td>
            <td class="text-right">${this.formatCurrency(totaleCompensi)}</td>
            <td class="text-right">${this.formatCurrency(compensiRows.reduce((sum, row) => sum + row.recuperati, 0))}</td>
            <td class="text-right">${this.formatCurrency(compensiRows.reduce((sum, row) => sum + row.liquidabili, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ''}

    ${data.options.includiDettaglioPratiche && pratichePages.length > 0 ? pratichePages.map((pagePrat, pageIdx) => `
    <div class="page-break"></div>
    <div class="section">
      <div class="page-title">Dettaglio Pratiche ${pratichePages.length > 1 ? `(Pag. ${pageIdx + 1}/${pratichePages.length})` : ''}</div>
      <table>
        <thead>
          <tr>
            <th>Numero Pratica</th>
            <th>Debitore</th>
            <th class="text-right">Capitale</th>
            <th>Apertura</th>
          </tr>
        </thead>
        <tbody>
          ${pagePrat.map(p => {
              const debitore = p.debitore?.ragioneSociale || (p.debitore ? `${p.debitore.nome || ''} ${p.debitore.cognome || ''}`.trim() : 'N/D');
              return `
            <tr>
              <td>${p.numeroPratica || `#${p.id.slice(0, 8)}`}</td>
              <td>${debitore}</td>
              <td class="text-right">${this.formatCurrency(p.capitale || 0)}</td>
              <td>${p.createdAt ? this.formatDate(new Date(p.createdAt)) : '-'}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    `).join('') : ''}

    ${data.options.includiAlert !== false && alertPages.length > 0 ? alertPages.map((pageAlert, pageIdx) => `
    <div class="page-break"></div>
    <div class="section">
      <div class="page-title">Alert e Scadenze ${alertPages.length > 1 ? `(Pag. ${pageIdx + 1}/${alertPages.length})` : ''}</div>
      <table>
        <thead>
          <tr>
            <th>Scadenza</th>
            <th>Titolo</th>
            <th>Numero Pratica</th>
          </tr>
        </thead>
        <tbody>
          ${pageAlert.map(a => `
          <tr>
            <td>${a.dataScadenza ? this.formatDate(new Date(a.dataScadenza)) : '-'}</td>
            <td>${a.titolo || '-'}</td>
            <td>${a.pratica?.numeroPratica || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `).join('') : ''}

    ${data.options.includiTickets !== false && data.tickets.length > 0 ? `
    <div class="page-break"></div>
    <div class="section">
      <div class="page-title">Ticket</div>
      <table>
        <thead>
          <tr>
            <th>Numero</th>
            <th>Oggetto</th>
            <th>Pratica</th>
            <th>Stato</th>
            <th>Priorità</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          ${data.tickets.slice(0, 20).map(t => `
            <tr>
              <td>${t.numeroTicket || '-'}</td>
              <td>${t.oggetto || '-'}</td>
              <td>${t.pratica?.numeroPratica || t.pratica?.id?.slice(0, 8) || '-'}</td>
              <td>${t.stato || '-'}</td>
              <td>${t.priorita || '-'}</td>
              <td>${t.dataCreazione ? this.formatDate(new Date(t.dataCreazione)) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${data.tickets.length > 20 ? `<div style="margin-top:8px; font-size:11px; color:#475569;">... e altri ${data.tickets.length - 20} ticket</div>` : ''}
    </div>
    ` : ''}
      </div>
      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-logo">
          <img src="data:image/png;base64,${LOGO_RESOLV_FULL}" alt="Resolv" />
          <div class="footer-text">
            Software gestionale per studi legali e professionisti del settore creditizio<br>
            Report generato il ${new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
            <div class="copyright">© ${new Date().getFullYear()} Resolv. Tutti i diritti riservati.</div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
      `;
      }
      async renderHtmlToPdf(html: string): Promise<Buffer> {
          const browser = await puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const pdf = await page.pdf({
              format: 'A4',
              printBackground: true,
              margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          });
          await browser.close();
          return Buffer.from(pdf);
      }
      getTipoMovimentoLabel(tipo: TipoMovimento | string): string {
          const labels = {
              capitale: 'Capitale',
              anticipazione: 'Anticipazione',
              compenso: 'Compenso',
              interessi: 'Interessi',
              altro: 'Altro',
              recupero_capitale: 'Recupero Capitale',
              recupero_anticipazione: 'Recupero Anticipazione',
              recupero_compenso: 'Recupero Compenso',
              recupero_interessi: 'Recupero Interessi',
              recupero_altro: 'Recupero Altro',
          };
          return labels[tipo] || tipo;
      }
      async generaReportFatturazione(movimenti: MovimentoFinanziario[], clienteId?: string): Promise<Buffer> {
          let cliente: Cliente | null = null;
          if (clienteId) {
              cliente = await this.clienteRepo.findOne({
                  where: { id: clienteId },
                  relations: ['studio'],
              });
          }
          const studio = cliente?.studio || await this.studioRepo.findOne({ where: {} });
          const totale = movimenti.reduce((sum, m) => sum + this.normalizeImporto(m.importo), 0);
          const html = this.buildHtmlFatturazione({
              movimenti,
              cliente,
              studio,
              totale,
          });
          return this.renderHtmlToPdf(html);
      }
      buildHtmlFatturazione(data: { movimenti: MovimentoFinanziario[]; cliente: Cliente | null; studio: Studio | null; totale: number; }): string {
          const dataOggi = new Date().toLocaleDateString('it-IT', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          });
          const nomeCliente = data.cliente
              ? data.cliente.ragioneSociale || 'Cliente'
              : 'Tutti i clienti';
          const nomeStudio = data.studio?.nome || 'Resolv';
          const indirizzoStudio = data.studio?.indirizzo || '';
          const telefonoStudio = data.studio?.telefono || '';
          const emailStudio = data.studio?.email || '';
          const movimentiDaFatturare = data.movimenti.filter((mov) => mov.giaFatturato !== true);
          const totaleImporto = movimentiDaFatturare.reduce((sum, mov) => sum + this.normalizeImporto(mov.importo), 0);
          const movimentiRows = movimentiDaFatturare.map((mov, index) => {
              const dataStr = mov.data ? this.formatDate(new Date(mov.data)) : '-';
              const tipoLabel = this.getTipoMovimentoLabel(mov.tipo).replace(/_/g, ' ');
              const descrizione = mov.oggetto ? mov.oggetto.replace(/_/g, ' ') : '-';
              const importoStr = this.formatCurrency(this.normalizeImporto(mov.importo));
              const numeroPratica = mov.pratica?.numeroPratica ||
                  (mov.pratica?.id ? `#${mov.pratica.id.slice(0, 8)}` : '-');
              const debitore = mov.pratica?.debitore
                  ? mov.pratica.debitore.ragioneSociale ||
                      `${mov.pratica.debitore.nome || ''} ${mov.pratica.debitore.cognome || ''}`.trim()
                  : '-';
              return `
          <tr class="${index % 2 === 0 ? 'row-alt' : ''}">
            <td>${dataStr}</td>
            <td>${numeroPratica}</td>
            <td>${debitore || '-'}</td>
            <td>${tipoLabel}</td>
            <td>${descrizione}</td>
            <td class="text-right">${importoStr}</td>
          </tr>
        `;
          }).join('');
          return `
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Report Fatturazione - ${nomeCliente}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: #eef2f7;
        color: #0f172a;
        padding: 20px;
      }
      .page {
        max-width: 1240px;
        margin: 0 auto;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 24px 70px rgba(4, 12, 34, 0.18);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 40px);
      }
      .hero {
        background: #0b1224;
        color: #fff;
        padding: 28px 32px;
      }
      .hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand img {
        width: 78px;
        height: 78px;
        border-radius: 0;
        background: none;
        padding: 0;
      }
      .title {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .subtitle {
        margin-top: 2px;
        font-size: 13px;
        color: #d8e4ff;
      }
      .badge {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.2);
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        color: #e9f0ff;
      }
      .section {
        padding: 26px 32px 32px;
        flex: 1;
      }
      h2 {
        font-size: 18px;
        margin-bottom: 14px;
        font-weight: 800;
        color: #0f172a;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 18px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px 16px;
        background: linear-gradient(180deg, #f7f9fc 0%, #fff 80%);
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #6b7280;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .value {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      .table-wrapper {
        margin-top: 10px;
        border: 1px solid #dfe5ef;
        border-radius: 14px;
        overflow: hidden;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      thead {
        background: #f0f4fa;
        color: #0f172a;
      }
      th, td {
        padding: 12px 10px;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
      }
      th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 700;
        color: #4b5563;
      }
      td { color: #0f172a; }
      td.text-right { text-align: right; font-weight: 700; color: #0f172a; }
      .row-alt { background: #f8fafc; }
      tfoot td {
        background: #0f172a;
        color: #e7ecf5;
        font-weight: 800;
        border-color: #0f172a;
      }
      .empty {
        padding: 28px;
        text-align: center;
        color: #6b7280;
        border: 1px dashed #cbd5e1;
        border-radius: 12px;
        margin-top: 8px;
        background: #f8fafc;
      }
      .footer {
        margin-top: auto;
        background: linear-gradient(135deg, #0c162b 0%, #13335a 45%, #1f4d8b 100%);
        color: #e7ecf5;
        padding: 16px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .footer-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .footer-left img { height: 42px; width: auto; }
      .footer-text { font-size: 10px; line-height: 1.5; }
      .footer-text .copyright { margin-top: 4px; color: #c7d1df; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hero">
        <div class="hero-top">
          <div class="brand">
            <img src="data:image/png;base64,${LOGO_RESOLV_DEFAULT}" alt="Logo" />
            <div>
              <div class="title">Report Fatturazione</div>
              <div class="subtitle">${nomeCliente}</div>
              <div class="subtitle">Generato il ${dataOggi}</div>
            </div>
          </div>
          <div class="badge">Movimenti da fatturare</div>
        </div>
      </div>

      <div class="section">
        <h2>Riepilogo</h2>
        <div class="grid">
          <div class="card">
            <div class="label">Cliente</div>
            <div class="value">${nomeCliente}</div>
            <div class="label" style="margin-top:10px;">Totale movimenti</div>
            <div class="value">${movimentiDaFatturare.length}</div>
          </div>
          <div class="card">
            <div class="label">Studio</div>
            <div class="value">${nomeStudio}</div>
            ${indirizzoStudio ? `<div class="label" style="margin-top:10px;">Indirizzo</div><div class="value" style="font-size:13px; font-weight:600;">${indirizzoStudio}</div>` : ''}
            ${telefonoStudio ? `<div class="label" style="margin-top:10px;">Telefono</div><div class="value" style="font-size:13px; font-weight:600;">${telefonoStudio}</div>` : ''}
            ${emailStudio ? `<div class="label" style="margin-top:10px;">Email</div><div class="value" style="font-size:13px; font-weight:600;">${emailStudio}</div>` : ''}
          </div>
        </div>

        <h2 style="margin-top:12px;">Movimenti da fatturare</h2>
        ${movimentiDaFatturare.length === 0 ? `<div class="empty">Nessun movimento disponibile da fatturare.</div>` : `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Pratica</th>
                <th>Debitore</th>
                <th>Tipo</th>
                <th>Descrizione</th>
                <th style="text-align:right;">Importo</th>
              </tr>
            </thead>
            <tbody>
              ${movimentiRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;">Totale da fatturare</td>
                <td class="text-right" style="color:#e7ecf5;">${this.formatCurrency(totaleImporto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`}
      </div>

      <div class="footer">
        <div class="footer-left">
          <img src="data:image/png;base64,${LOGO_RESOLV_FULL}" alt="Resolv" />
          <div class="footer-text">
            <div>Software gestionale per studi legali e professionisti del settore creditizio</div>
            <div class="copyright">© ${new Date().getFullYear()} ${nomeStudio}. Tutti i diritti riservati.</div>
          </div>
        </div>
        <div class="footer-text" style="text-align:right;">
          Report generato automaticamente<br />${dataOggi}
        </div>
      </div>
    </div>
  </body>
  </html>
      `;
      }
}
