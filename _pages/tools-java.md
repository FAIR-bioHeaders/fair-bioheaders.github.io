---
layout: single
title: "Java tools"
permalink: /tools/java/
excerpt: "Set up and use the native Java source library for FAIR BioHeaders."
---

## Setup

Use JDK 17 or later. The committed Maven wrapper resolves the dependencies.
Build from this source revision; the source version is `0.1.0-SNAPSHOT`.

```sh
git clone https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Java.git
cd FAIR-bioHeaders-Tools-Java
git checkout 5fb3d1d1b98304c908a6fb40b02340fa7048c65d
./mvnw -DskipTests package
java -jar target/fair-bioheaders-java-0.1.0-SNAPSHOT.jar version
java -jar target/fair-bioheaders-java-0.1.0-SNAPSHOT.jar verify genome.fhr.fasta
```

The package command above is a build-only step: `-DskipTests` skips both unit
and conformance tests. Full validation needs additional pinned shared suites;
follow the [native acceptance instructions](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Java/blob/5fb3d1d1b98304c908a6fb40b02340fa7048c65d/docs/NATIVE-ACCEPTANCE.md)
before relying on a locally built artifact. A successful package build alone is
not acceptance evidence.
Keep `target/lib/` alongside the jar when moving it: the jar manifest references
those runtime dependencies. This is a source-build workflow, not a Maven Central
coordinate or publication claim.

## Read and inspect results

In a Java application with the built library and dependencies on its classpath:

```java
import java.nio.file.Path;
import org.fairbioheaders.BioHeaders;
import org.fairbioheaders.VerifyResult;

VerifyResult result = new BioHeaders().verifyFile(Path.of("genome.fhr.fasta"));
System.out.println(result.isValid());
System.out.println(result.computedChecksum());
for (var issue : result.issues()) System.out.println(issue);
```

`BioHeaders` coordinates reading, checksum and cited-schema validation; inspect
issues as well as the boolean. Gzip/BGZF is transport, so checksum coverage is
against decompressed file bytes. This library verifies existing headers rather
than writing them. Its optional pinned draft/model lane is distinct from
released support and from GFF3 feature/biology validation.

## Support and further reading

The library API example was exercised against the packaged jar and its adjacent
dependencies: valid plain and gzip files passed, and a modified sequence failed
the checksum check. This example check is separate from full native acceptance.

This guide records source commit `5fb3d1d1b98304c908a6fb40b02340fa7048c65d` (source snapshot recorded November 20, 2026).
The build's released header set is FHR 2.1, FHP 1.2 and FHGFF3 1.2 from shared
v0.6.0. FHT and FHGM recognition at this pin is an explicit historical draft
lane, not support for the subsequently published v0.7.0/v0.8.0 contracts.
Use the [pinned README](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Java/tree/5fb3d1d1b98304c908a6fb40b02340fa7048c65d/README.md) and
[capability documentation](https://github.com/FAIR-bioHeaders/FAIR-bioHeaders-Tools-Java/tree/5fb3d1d1b98304c908a6fb40b02340fa7048c65d/docs/) for detailed limits and API guidance.
Current development may have advanced; inspect changes before updating a pin.

These are starting commands and API examples, not a claim that a new registry
artifact was published. Keep file/schema/parent/model verdicts separate and
never interpret a missing layer as verified. See [all tools](/tools/) and
[the browser lesson](/metadata-viewer/) for other workflows.
