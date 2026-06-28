import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  subDays,
} from "date-fns";
import { id as localeID } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react-native";
import { BottomSheet } from "./BottomSheet";
import { colors, radius, spacing, textStyles } from "@/theme";
import Button from "./Button";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

const WEEKDAYS = ["S", "S", "R", "K", "J", "S", "M"]; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(value));

  const daysGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Group into rows of 7 days
    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7));
    }
    return rows;
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleSelectDate = useCallback(
    (date: Date) => {
      // Keep original time components when updating the date
      const newDate = new Date(value);
      newDate.setFullYear(date.getFullYear());
      newDate.setMonth(date.getMonth());
      newDate.setDate(date.getDate());
      onChange(newDate);
      setCurrentMonth(newDate);
    },
    [value, onChange]
  );

  const selectPreset = useCallback(
    (daysAgo: number) => {
      const target = subDays(new Date(), daysAgo);
      handleSelectDate(target);
    },
    [handleSelectDate]
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.trigger}>
        <CalendarIcon size={18} color={colors.text.secondary} style={styles.triggerIcon} />
        <Text style={styles.triggerText}>
          {format(value, "eeee, d MMMM yyyy", { locale: localeID })}
        </Text>
        <Pressable
          onPress={() => {
            setCurrentMonth(new Date(value));
            setIsOpen(true);
          }}
          style={({ pressed }) => [
            StyleSheet.absoluteFillObject,
            pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
          ]}
        />
      </View>

      <BottomSheet isVisible={isOpen} onDismiss={() => setIsOpen(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Pilih Tanggal</Text>

          {/* Quick Select Presets */}
          <View style={styles.presetsRow}>
            <View
              style={[
                styles.presetBtn,
                isSameDay(value, new Date()) && styles.presetBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  isSameDay(value, new Date()) && styles.presetTextActive,
                ]}
              >
                Hari Ini
              </Text>
              <Pressable
                onPress={() => selectPreset(0)}
                style={({ pressed }) => [
                  StyleSheet.absoluteFillObject,
                  pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                ]}
              />
            </View>
            <View
              style={[
                styles.presetBtn,
                isSameDay(value, subDays(new Date(), 1)) && styles.presetBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  isSameDay(value, subDays(new Date(), 1)) && styles.presetTextActive,
                ]}
              >
                Kemarin
              </Text>
              <Pressable
                onPress={() => selectPreset(1)}
                style={({ pressed }) => [
                  StyleSheet.absoluteFillObject,
                  pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                ]}
              />
            </View>
            <View
              style={[
                styles.presetBtn,
                isSameDay(value, subDays(new Date(), 2)) && styles.presetBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  isSameDay(value, subDays(new Date(), 2)) && styles.presetTextActive,
                ]}
              >
                2 Hari Lalu
              </Text>
              <Pressable
                onPress={() => selectPreset(2)}
                style={({ pressed }) => [
                  StyleSheet.absoluteFillObject,
                  pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                ]}
              />
            </View>
          </View>

          {/* Calendar Month Selector Header */}
          <View style={styles.monthHeader}>
            <View style={styles.navBtn}>
              <ChevronLeft size={20} color={colors.text.primary} />
              <Pressable
                onPress={handlePrevMonth}
                style={({ pressed }) => [
                  StyleSheet.absoluteFillObject,
                  pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                ]}
              />
            </View>
            
            <Text style={styles.monthLabel}>
              {format(currentMonth, "MMMM yyyy", { locale: localeID })}
            </Text>

            <View style={styles.navBtn}>
              <ChevronRight size={20} color={colors.text.primary} />
              <Pressable
                onPress={handleNextMonth}
                style={({ pressed }) => [
                  StyleSheet.absoluteFillObject,
                  pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                ]}
              />
            </View>
          </View>

          {/* Calendar Weekdays Row */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={styles.gridContainer}>
            {daysGrid.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map((day, dayIdx) => {
                  const isCurrent = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, value);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <View key={dayIdx} style={styles.dayCellWrapper}>
                      <View
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          !isCurrent && styles.dayCellOutOfMonth,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            !isCurrent && styles.dayTextOutOfMonth,
                            isToday && !isSelected && styles.dayTextToday,
                          ]}
                        >
                          {format(day, "d")}
                        </Text>
                        <Pressable
                          onPress={() => handleSelectDate(day)}
                          style={({ pressed }) => [
                            StyleSheet.absoluteFillObject,
                            pressed && { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Confirm Action Button */}
          <View style={styles.footer}>
            <Button label="Konfirmasi" onPress={handleConfirm} fullWidth />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    height: 48,
    paddingHorizontal: spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  triggerIcon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 14,
    color: colors.text.primary,
  },

  sheetContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  sheetTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  presetsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  presetBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  presetBtnActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  presetText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
    color: colors.text.secondary,
  },
  presetTextActive: {
    color: colors.bg.canvas,
    fontWeight: "600",
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  monthLabel: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
    fontWeight: "600",
  },

  weekdaysRow: {
    flexDirection: "row",
    width: "100%",
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.muted,
  },

  gridContainer: {
    gap: 6,
    width: "100%",
  },
  gridRow: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  dayCellWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  dayCell: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  dayCellSelected: {
    backgroundColor: colors.accent.primary,
  },
  dayCellOutOfMonth: {
    opacity: 0.3,
  },
  dayCellToday: {
    borderColor: colors.accent.primary,
  },
  dayText: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 14,
    color: colors.text.primary,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  dayTextSelected: {
    color: colors.bg.canvas,
    fontWeight: "600",
  },
  dayTextOutOfMonth: {
    color: colors.text.muted,
  },
  dayTextToday: {
    color: colors.accent.text,
    fontWeight: "600",
  },

  footer: {
    marginTop: spacing.sm,
  },
});
