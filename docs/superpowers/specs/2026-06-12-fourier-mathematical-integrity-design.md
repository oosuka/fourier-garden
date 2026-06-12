# Fourier Garden Mathematical Integrity Design

## Product Definition

Fourier Garden is an audiovisual product built around:

- finite Fourier-series synthesis;
- geometric visualization of that synthesis with complex exponentials and phasors;
- real-time images and musical sonification derived from the selected series.

It is not a visualization of the Fast Fourier Transform algorithm. No unknown
coefficients are estimated by a DFT or FFT in `Residue Bloom`; its coefficients
are known analytically.

## Mathematical Layer

The first chapter uses

\[
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x).
\]

Define \(n_k=4k+1\), \(A_k=5/(k+1)\), and

\[
z(x)=\sum_{k=0}^{12}A_k e^{i n_k x}.
\]

The circles are the summands of \(z(x)\). Their chained endpoint is \(z(x)\),
and the displayed primary waveform is exactly

\[
f(x)=\operatorname{Im}z(x).
\]

The screen uses the observation time scale \(x(t)=0.31t\). The 55 Hz labels
belong to the analytic frequency mapping and do not claim that the visible
fundamental phasor rotates 55 times per second.

The stored phase uses the sine/imaginary-projection convention. It is zero for
this chapter. For the conventional two-sided complex Fourier series,

\[
c_{n_k}=-\frac{iA_k}{2},\qquad
c_{-n_k}=\frac{iA_k}{2}.
\]

The coefficient spectrum is analytic source data, not an FFT estimate.

## Sonification Layer

The audible result is a musical sonification, not a claim that a 55 Hz
rendering of \(f\) is heard without modification. For each rhythmic carrier
\(\nu_j\), the dry source is

\[
g_{\nu_j}(\tau)=
C\sum_{\substack{k\\n_k\nu_j<\eta F_s/2}}
\frac{A_k}{(k+1)^\delta}
\sin(2\pi n_k\nu_j\tau),
\]

multiplied by a short envelope. Here \(\delta=1.4\) is perceptual high-order
damping, \(\eta=0.9\) is the anti-alias guard, and the carriers follow the
80 BPM pattern \(9f_0,8f_0,8f_0,9f_0\), with \(f_0=55\) Hz.

EQ, stereo detuning, dynamics, and generated reverberation are post-synthesis
sound design. The UI and documentation must describe this distinction.

## Poetic Layer

Particles, membranes, nebulae, bloom, and secondary trails share the transport,
palette, and focal point of the mathematical layer. They are interpretive
artwork and must not be described as literal graphs of the Fourier series.

## Acceptance Criteria

- The raw epicycle endpoint's vertical coordinate equals `evaluateSeries`.
- The first point of the primary history waveform equals the current endpoint.
- The primary history waveform is a uniformly scaled evaluation of the series,
  without decorative taper or perturbation.
- The observation angular rate is explicit and distinct from the 55 Hz
  analytic frequency mapping.
- The phase table identifies the sine convention and reports zero.
- The complex coefficient relation is shown in the mathematical explanation.
- The audio implementation and explanation use the same explicit
  band-limited, perceptually weighted sonification model.
- README, mathematical documentation, design QA, and in-product copy all state
  that this is Fourier-series synthesis rather than FFT computation.
