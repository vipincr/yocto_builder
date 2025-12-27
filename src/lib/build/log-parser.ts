import { YoctoErrorType } from '@/types/build';

export const YOCTO_ERROR_PATTERNS: Record<YoctoErrorType, RegExp[]> = {
  PARSE_ERROR: [
    /ParseError at (.+):(\d+)/,
    /ERROR: ParseError at/,
    /ERROR: (.+): Error parsing recipe/,
    /SyntaxError: invalid syntax/,
  ],
  
  FETCH_ERROR: [
    /ERROR: Fetcher failure for URL: '(.+)'/,
    /ERROR: (.+): Fetcher failure/,
    /Network is unreachable/,
    /ERROR: Unable to fetch URL/,
    /Fetch command .+ failed with exit code/,
  ],
  
  COMPILE_ERROR: [
    /error: (.+)/,
    /ERROR: oe_runmake failed/,
    /make\[\d+\]: \*\*\* \[(.+)\] Error \d+/,
    /fatal error: (.+): No such file or directory/,
    /undefined reference to/,
    /error: 'class (.+)' has no member named/,
  ],
  
  PATCH_ERROR: [
    /Patch (.+) does not apply/,
    /ERROR: (.+): patch (.+) cannot be applied/,
    /FAILED/,
    /Hunk #\d+ FAILED/,
  ],
  
  CONFIGURATION_ERROR: [
    /ERROR: Nothing PROVIDES '(.+)'/,
    /ERROR: Required build target '(.+)' has no buildable providers/,
    /ERROR: DISTRO '(.+)' not found/,
    /ERROR: MACHINE configuration for '(.+)' not found/,
    /ERROR: Unable to parse conf\/local.conf/,
  ],
  
  DEPENDENCY_ERROR: [
    /ERROR: (.+) was skipped: missing required distro features/,
    /ERROR: Multiple .bb files/,
    /ERROR: (.+) depends upon (.+), but it is not in any local layer/,
    /ERROR: Nothing RPROVIDES '(.+)'/,
  ],
  
  LICENSE_ERROR: [
    /ERROR: (.+): md5 checksum does not match/,
    /ERROR: (.+) has a restricted license/,
    /LICENSE_FLAGS_ACCEPTED/,
  ],
  
  PACKAGE_ERROR: [
    /ERROR: QA Issue/,
    /do_package_qa: QA Issue/,
    /ERROR: (.+)-\S+: Files\/directories were installed but not shipped/,
  ],
  
  UNKNOWN_ERROR: [],
};

export function parseLogLine(line: string): {
  isError: boolean;
  errorType?: YoctoErrorType;
  details?: Record<string, string>;
} {
  for (const [errorType, patterns] of Object.entries(YOCTO_ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          isError: true,
          errorType: errorType as YoctoErrorType,
          details: {
            fullMatch: match[0],
            captures: match.slice(1).join(' '),
          },
        };
      }
    }
  }
  
  // Generic error detection
  if (/^ERROR:|^FATAL:|^error:/i.test(line)) {
    return { isError: true, errorType: 'UNKNOWN_ERROR' };
  }
  
  return { isError: false };
}

export function extractErrorSummary(logs: string[]): {
  totalErrors: number;
  errors: Array<{
    type: YoctoErrorType;
    message: string;
    file?: string;
    recipe?: string;
  }>;
} {
  const errors: Array<{
    type: YoctoErrorType;
    message: string;
    file?: string;
    recipe?: string;
  }> = [];

  for (const line of logs) {
    const parsed = parseLogLine(line);
    if (parsed.isError && parsed.errorType) {
      errors.push({
        type: parsed.errorType,
        message: parsed.details?.fullMatch || line,
        file: parsed.details?.captures?.match(/(.+):(\d+)/)?.[1],
        recipe: parsed.details?.captures?.match(/recipe (.+)/)?.[1],
      });
    }
  }

  return {
    totalErrors: errors.length,
    errors: errors.slice(0, 50), // Limit to first 50 errors
  };
}

