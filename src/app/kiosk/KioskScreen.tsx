"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Box, Button, Center, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { LuCircleAlert, LuLogIn, LuLogOut, LuNfc, LuSmartphoneNfc, LuTimer } from "react-icons/lu";
import QRCode from "qrcode";

import { KioskTap, kioskBindCodeActive, kioskTap } from "./actions";

const RESULT_MS = 5000;
const POLL_MS = 4000;

type Shown = Exclude<KioskTap, { result: "unbound" }>;
type Pending = { card: string; code: string; svg: string };

const RESULT_STYLE: Record<Shown["result"], { palette: string; icon: IconType }> = {
  clockedIn: { palette: "green", icon: LuLogIn },
  clockedOut: { palette: "blue", icon: LuLogOut },
  locked: { palette: "orange", icon: LuCircleAlert },
  tooShort: { palette: "orange", icon: LuTimer },
  tooSoon: { palette: "gray", icon: LuTimer },
  invalid: { palette: "red", icon: LuCircleAlert },
  forbidden: { palette: "red", icon: LuCircleAlert },
  failed: { palette: "red", icon: LuCircleAlert },
};

/** One short beep for success, two low ones for anything that needs attention. */
function beep(ok: boolean) {
  try {
    const context = new AudioContext();
    const tones = ok ? [880] : [330, 330];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.15;
      oscillator.connect(gain).connect(context.destination);
      const start = context.currentTime + index * 0.2;
      oscillator.start(start);
      oscillator.stop(start + 0.12);
    });
  } catch {
    // No audio on this device; the screen still shows the result.
  }
}

type NdefReader = { scan: () => Promise<void>; onreading: ((event: { serialNumber: string }) => void) | null };

const noSubscribe = () => () => { };
/** Web NFC is only in Android Chrome; false while rendering on the server. */
const useHasWebNfc = () => useSyncExternalStore(noSubscribe, () => "NDEFReader" in window, () => false);

/**
 * The card reader screen. A USB reader that types the UID followed by Enter works as is; on Android Chrome with NFC,
 * the "Use this device's NFC" button reads cards with Web NFC instead. Use one kind of reader: the two may report the
 * same card differently.
 */
export default function KioskScreen() {
  const t = useTranslations("Kiosk");
  const format = useFormatter();
  const now = useNow({ updateInterval: 1000 });

  const [shown, setShown] = useState<Shown | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasWebNfc = useHasWebNfc();
  const [nfcOn, setNfcOn] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = (next: Shown) => {
    setShown(next);
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setShown(null), RESULT_MS);
  };

  const submit = async (raw: string) => {
    if (!raw.trim() || busy) return;
    setBusy(true);
    try {
      const tap = await kioskTap(raw);
      beep(tap.result === "clockedIn" || tap.result === "clockedOut" || tap.result === "unbound");
      if (tap.result === "unbound") {
        // A new unbound card replaces the code on screen, just as the server replaced it.
        const svg = await QRCode.toString(tap.bindUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
        setPending({ card: tap.card, code: tap.code, svg });
        setLinked(null);
        setShown(null);
      } else {
        show(tap);
      }
    } catch {
      beep(false);
      show({ result: "failed" });
    } finally {
      setBusy(false);
    }
  };

  // Keep the hidden input focused so a keyboard-style reader always types into it.
  useEffect(() => {
    const focus = () => input.current?.focus();
    focus();
    const timer = setInterval(focus, 1000);
    return () => clearInterval(timer);
  }, []);

  // Drop the QR code once someone has linked the card with it.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      if (!(await kioskBindCodeActive(pending.code))) {
        setLinked(pending.card);
        setPending(null);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pending]);

  const startNfc = async () => {
    try {
      const Reader = (window as unknown as { NDEFReader: new () => NdefReader }).NDEFReader;
      const reader = new Reader();
      await reader.scan();
      reader.onreading = event => { void submit(event.serialNumber); };
      setNfcOn(true);
    } catch {
      show({ result: "failed" });
    }
  };

  const style = shown ? RESULT_STYLE[shown.result] : null;
  const ResultIcon = style?.icon;

  return (
    <Box position="fixed" inset={0} zIndex="overlay" bg="bg" overflow="hidden" onClick={() => input.current?.focus()}>
      <input
        ref={input}
        aria-label={t("readerInput")}
        autoComplete="off"
        inputMode="none"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        onKeyDown={event => {
          if (event.key !== "Enter") return;
          const value = event.currentTarget.value;
          event.currentTarget.value = "";
          void submit(value);
        }}
      />

      <Flex h="full" direction={{ base: "column", lg: "row" }}>
        <Center flex="1" p={8} bg={style ? `${style.palette}.subtle` : undefined} transition="background 0.2s">
          <Stack align="center" textAlign="center" gap={6} maxW="xl">
            {shown && ResultIcon ? (<>
              <Box color={`${style!.palette}.fg`}><ResultIcon size={96} /></Box>
              {"name" in shown && <Heading size={{ base: "3xl", md: "5xl" }}>{shown.name}</Heading>}
              <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="semibold" color={`${style!.palette}.fg`}>
                {t(`results.${shown.result}`)}
              </Text>
            </>) : (<>
              <Box color="fg.muted"><LuNfc size={96} /></Box>
              <Heading size={{ base: "3xl", md: "5xl" }}>{t("prompt")}</Heading>
              <Text fontSize={{ base: "2xl", md: "4xl" }} fontVariantNumeric="tabular-nums" color="fg.muted">
                {format.dateTime(now, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Text>
              {linked && <Text fontSize="lg" color="green.fg">{t("linked", { card: linked })}</Text>}
            </>)}
          </Stack>
        </Center>

        {pending && (
          <Center
            w={{ base: "full", lg: "sm" }}
            p={6}
            borderTopWidth={{ base: "1px", lg: 0 }}
            borderLeftWidth={{ base: 0, lg: "1px" }}
            bg="bg.subtle"
          >
            <Stack align="center" textAlign="center" gap={3}>
              <Text fontWeight="semibold" fontSize="lg">{t("newCard", { card: pending.card })}</Text>
              <Box
                w={{ base: "56", lg: "64" }}
                bg="white"
                p={2}
                rounded="md"
                css={{ "& svg": { width: "100%", height: "auto", display: "block" } }}
                dangerouslySetInnerHTML={{ __html: pending.svg }}
              />
              <Text fontSize="sm" color="fg.muted">{t("scanToLink")}</Text>
            </Stack>
          </Center>
        )}
      </Flex>

      {hasWebNfc && !nfcOn && (
        <Button position="absolute" bottom={4} left={4} size="sm" variant="outline" onClick={startNfc}>
          <LuSmartphoneNfc />{t("useDeviceNfc")}
        </Button>
      )}
    </Box>
  );
}
