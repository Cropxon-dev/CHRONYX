import exifr from "exifr";

export interface ExifData {
  dateTaken: Date | null;
  latitude: number | null;
  longitude: number | null;
  make: string | null;
  model: string | null;
}

export const extractExifData = async (file: File): Promise<ExifData> => {
  try {
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model'],
    });

    if (!exif) {
      return {
        dateTaken: null,
        latitude: null,
        longitude: null,
        make: null,
        model: null,
      };
    }

    let dateTaken: Date | null = null;
    if (exif.DateTimeOriginal) {
      dateTaken = new Date(exif.DateTimeOriginal);
    } else if (exif.CreateDate) {
      dateTaken = new Date(exif.CreateDate);
    }

    return {
      dateTaken: dateTaken && !isNaN(dateTaken.getTime()) ? dateTaken : null,
      latitude: exif.latitude || null,
      longitude: exif.longitude || null,
      make: exif.Make || null,
      model: exif.Model || null,
    };
  } catch (error) {
    console.log("EXIF extraction failed:", error);
    return {
      dateTaken: null,
      latitude: null,
      longitude: null,
      make: null,
      model: null,
    };
  }
};

export const formatGpsCoords = (lat: number | null, lng: number | null): string | null => {
  if (lat === null || lng === null) return null;
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
};
